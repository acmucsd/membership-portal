const Sequelize = require('sequelize');
const express = require('express');
const { flatten } = require('underscore');
const error = require('../../../error');
const { Activity, User, Merchandise, Order, OrderItem, db } = require('../../../db');

const router = express.Router();

router.route('/merchandise/:uuid?')

  .get((req, res, next) => {
    const offset = parseInt(req.query.offset, 10);
    const limit = parseInt(req.query.limit, 10);
    const findMerchandise = req.params.uuid
      ? Merchandise.findByUUID(req.params.uuid)
      : Merchandise.getAllItems(offset, limit);
    findMerchandise.then((merchandise) => {
      res.json({ error: null, merchandise });
    }).catch((err) => next(err));
  })

  /**
   * All further requests on this route require authentication and admin access.
   */
  .all((req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  .post((req, res, next) => {
    if (!req.body.merchandise) return next(new error.BadRequest('Merchandise item must be provided'));

    Merchandise.create(req.body.merchandise).then((merchandise) => {
      res.json({ error: null, merchandise });
    }).catch((err) => next(err));
  })

  .patch((req, res, next) => {
    if (!req.params.uuid || !req.body.merchandise) {
      return next(new error.BadRequest('UUID and partial merchandise item object must be provided'));
    }

    Merchandise.findByUUID(req.params.uuid).then((item) => {
      if (!item) throw new error.BadRequest('No such merchandise item found');
      return item.update(Merchandise.sanitize(req.body.merchandise));
    }).then((item) => res.json({ error: null, item })).catch((err) => next(err));
  })

  .delete((req, res, next) => {
    if (!req.params.uuid) return next(new error.BadRequest('UUID must be provided'));
    Merchandise.findByUUID(req.params.uuid).then((item) => {
      if (!item) throw new error.BadRequest('No such merchandise item found');
      return OrderItem.itemHasBeenOrdered(req.params.uuid).then((itemHasBeenOrdered) => {
        if (itemHasBeenOrdered) {
          throw new error.BadRequest('This item has been previously ordered and cannot be deleted.');
        }
        return Merchandise.destroyByUUID(req.params.uuid).then((numDeleted) => res.json({ error: null, numDeleted }));
      });
    }).catch((err) => next(err));
  });

router.route('/order/:uuid?')

  .get((req, res, next) => {
    const attachOrderItems = (orders) => Promise.all(orders.map((o) => OrderItem.findAllByOrder(o.uuid)))
      .then((orderItems) => {
        for (let i = 0; i < orders.length; i += 1) {
          orders[i].items = orderItems[i];
        }
        res.json({ error: null, orders });
      })
      .catch((err) => next(err));
    if (req.params.uuid) {
      Order.findByUUID(req.params.uuid).then((order) => {
        if (!req.user.isAdmin() && req.user.uuid !== order.user) {
          return next(new error.Forbidden());
        }
        OrderItem.findAllByOrder(order.uuid).then((orderItems) => {
          order.items = orderItems;
          res.json({ error: null, order });
        });
      }).catch((err) => next(err));
    } else if (req.user.isAdmin()) {
      Order.getAllOrders().then(attachOrderItems).catch((err) => next(err));
    } else {
      Order.findAllByUser(req.user.uuid).then(attachOrderItems).catch((err) => next(err));
    }
  })

  // TODO email
  .post((req, res, next) => {
    // in the format [{ item, quantity },...]
    if (!req.body.items) return next(new error.BadRequest('Items list must be provided'));
    // a db transaction to ensure all values (e.g. units in stock, user's credits) are the most current
    return db.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, (transaction) => Promise.all(req.body.items.map((i) => Merchandise.findByUUID(i.item))).then((items) => {
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].quantity < req.body.items[i].quantity) {
          throw new error.UserError(`There aren't enough units of "${items[i].itemName}" in stock`);
        }
        items[i].quantityRequested = req.body.items[i].quantity;
      }
      const totalCost = items.reduce((sum, i) => sum + (i.getPrice() * i.quantityRequested), 0);
      return User.hasEnoughCredits(req.user.uuid, totalCost).then((hasEnoughCredits) => {
        if (!hasEnoughCredits) throw new error.UserError('You don\'t have enough credits');
        return Promise.all([
          Order.create({ user: req.user.uuid, totalCost }).then((order) => {
            const orderItems = flatten(req.body.items
              .map(({ item, quantity }) => Array(quantity).fill({ order: order.uuid, item })));
            return Promise.all([
              OrderItem.bulkCreate(orderItems),
              Activity.orderMerchandise(req.user.uuid, `Order ${order.uuid}`),
            ]);
          }),
          Promise.all(items.map((i) => i.updateQuantity(i.quantityRequested))),
          req.user.spendCredits(totalCost),
        ]);
      });
    })).then(() => res.json({ error: null })).catch((err) => next(err));
  })

  // fulfilled: orderItem uuid[]
  .patch((req, res, next) => db.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  }, (transaction) => Promise.all(
    req.body.fulfilled.map((uuid) => OrderItem.findByUUID(uuid).then((orderItem) => orderItem.fulfill())),
  )).then(() => res.json()).catch((err) => next(err)));

module.exports = { router };
