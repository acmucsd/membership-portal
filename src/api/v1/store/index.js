const Sequelize = require('sequelize');
const express = require('express');
const { any, flatten, pick, intersection } = require('underscore');
const email = require('../../../email');
const error = require('../../../error');
const { Activity, User, MerchandiseCollection, Merchandise, Order, OrderItem, db } = require('../../../db');

const router = express.Router();

router.route('/collection/:uuid?')
  .get((req, res, next) => {
    if (req.params.uuid) {
      return MerchandiseCollection.findByUUID(req.params.uuid).then((collection) => {
        if (!collection) throw new error.NotFound('No such merchandise collection found');
        return Merchandise.findAllByCollection(collection.uuid).then((merchandise) => {
          collection.dataValues.merchandise = merchandise;
          res.json({ error: null, collection });
        });
      }).catch(next);
    }
    MerchandiseCollection.getAllCollections().then((collectionsMinusMerch) => Promise
      .all(collectionsMinusMerch.map((c) => Merchandise.findAllByCollection(c.uuid).then((merchandise) => {
        c.dataValues.merchandise = merchandise;
        return c;
      }))).then((collections) => {
        res.json({ error: null, collections });
      })).catch(next);
  })

  /**
   * All further requests on this route require authentication and admin access.
   */
  .all((req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  .post((req, res, next) => {
    if (!req.body.collection) return next(new error.BadRequest('Merchandise collection must be provided'));

    MerchandiseCollection.create(MerchandiseCollection.sanitize(req.body.collection)).then((collection) => {
      res.json({ error: null, collection });
    }).catch(next);
  })

  .patch((req, res, next) => {
    if (!req.params.uuid || !req.body.collection) {
      return next(new error.BadRequest('UUID and partial merchandise collection object must be provided'));
    }

    MerchandiseCollection.findByUUID(req.params.uuid).then((collection) => {
      if (!collection) throw new error.BadRequest('No such merchandise collection found');
      return collection.update(MerchandiseCollection.sanitize(req.body.collection));
    }).then((collection) => res.json({ error: null, collection })).catch(next);
  })

  .delete((req, res, next) => {
    if (!req.params.uuid) return next(new error.BadRequest('UUID must be provided'));
    MerchandiseCollection.findByUUID(req.params.uuid).then((collection) => {
      if (!collection) throw new error.BadRequest('No such merchandise collection found');
      return Merchandise.findAllByCollection(collection.uuid)
        .then((merchandise) => Promise.all(merchandise.map((m) => OrderItem.itemHasBeenOrdered(m.uuid)))
          .then((itemsHaveBeenOrdered) => {
            if (any(itemsHaveBeenOrdered)) {
              throw new error.BadRequest('An item from this collection has been previous ordered');
            }
            return Promise
              .all(merchandise.map((m) => Merchandise.destroyByUUID(m.uuid)))
              .then(() => MerchandiseCollection.destroyByUUID(collection.uuid));
          }));
    }).then(() => res.json({ error: null })).catch(next);
  });

router.route('/merchandise/:uuid?')

  /**
   * Given a merch item UUID in the URI, return the matching item or null if no such item was found.
   * Otherwise, returns all items listed on the store, including hidden items for admins.
   */
  .get((req, res, next) => {
    const offset = parseInt(req.query.offset, 10);
    const limit = parseInt(req.query.limit, 10);
    const findMerchandise = req.params.uuid
      ? Merchandise.findByUUID(req.params.uuid)
      : Merchandise.getAllItems(req.user.isAdmin(), offset, limit);
    findMerchandise.then((merchandise) => {
      res.json({ error: null, merchandise });
    }).catch(next);
  })

  /**
   * All further requests on this route require authentication and admin access.
   */
  .all((req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  /**
   * Creates an item, given a 'merchandise' object in the request body, and returns the created item
   * upon success. Required fields: itemName, price, description. Optional fields: picture, quantity,
   * discountPercentage, hidden. All other fields will be ignored.
   */
  .post((req, res, next) => {
    if (!req.body.merchandise) return next(new error.BadRequest('Merchandise item must be provided'));

    Merchandise.create(Merchandise.sanitize(req.body.merchandise)).then((merchandise) => {
      res.json({ error: null, merchandise });
    }).catch(next);
  })

  /**
   * Updates an item, given an item UUID in the URI and a 'merchandise' object in the request body, and
   * returns the updated item upon success. Optional fields: itemName, price, picture, description, addQuantity,
   * discountPercentage, hidden. All other fields will be ignored.
   */
  .patch((req, res, next) => {
    if (!req.params.uuid || !req.body.merchandise) {
      return next(new error.BadRequest('UUID and partial merchandise item object must be provided'));
    }

    Merchandise.findByUUID(req.params.uuid).then((item) => {
      if (!item) throw new error.BadRequest('No such merchandise item found');
      // reloads item to get the updated 'quantity' (see Merchandise::sanitize)
      return item.update(Merchandise.sanitize(req.body.merchandise)).then((i) => i.reload());
    }).then((item) => res.json({ error: null, item })).catch(next);
  })

  /**
   * Deletes an item, given an item UUID in the URI, if that item has not yet been ordered.
   */
  .delete((req, res, next) => {
    if (!req.params.uuid) return next(new error.BadRequest('UUID must be provided'));
    Merchandise.findByUUID(req.params.uuid).then((item) => {
      if (!item) throw new error.BadRequest('No such merchandise item found');
      return OrderItem.itemHasBeenOrdered(req.params.uuid).then((itemHasBeenOrdered) => {
        if (itemHasBeenOrdered) {
          throw new error.BadRequest('This item has been previously ordered and cannot be deleted.');
        }
        return Merchandise.destroyByUUID(req.params.uuid).then(() => res.json({ error: null }));
      });
    }).catch(next);
  });

router.route('/order/:uuid?')

  /**
   * Given an order UUID in the URI, return the matching order or null if no such order was found.
   * Otherwise, returns all orders placed by the current user, or all orders if the user is an admin.
   */
  .get((req, res, next) => {
    // assigns OrderItems to the 'dataValues' object because of how Sequelize instances are converted to JSON
    const attachOrderItems = (orders) => Promise.all(orders.map((o) => OrderItem.findAllByOrder(o.uuid)))
      .then((orderItems) => {
        for (let i = 0; i < orders.length; i += 1) {
          orders[i].dataValues.items = orderItems[i];
        }
        res.json({ error: null, orders });
      });
    if (req.params.uuid) {
      Order.findByUUID(req.params.uuid).then((order) => {
        if (!req.user.isAdmin() && req.user.uuid !== order.user) {
          throw new error.Forbidden();
        }
        OrderItem.findAllByOrder(order.uuid).then((orderItems) => {
          order.dataValues.items = orderItems;
          res.json({ error: null, order });
        });
      }).catch(next);
    } else if (req.user.isAdmin()) {
      Order.getAllOrders().then(attachOrderItems).catch(next);
    } else {
      Order.findAllByUser(req.user.uuid).then(attachOrderItems).catch(next);
    }
  })

  /**
   * Places an order for the current user, given an 'order' array of objects with 'item' (UUID)
   * and 'quantity' fields in the request body, if the user has enough credits and there are enough
   * units of each item in stock.
   */
  .post(async (req, res, next) => {
    try {
      if (!req.body.order) return next(new error.BadRequest('Items list must be provided'));
      // a db transaction to ensure all values (e.g. units in stock, user's credits) are the most current
      const [order, merch] = await db.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      }, async (transaction) => {
        // checks that enough units of requested items are in stock
        const items = await Promise.all(req.body.order.map((o) => Merchandise.findByUUID(o.item)));
        for (let i = 0; i < items.length; i += 1) {
          if (items[i].quantity < req.body.order[i].quantity) {
            throw new error.UserError(`There aren't enough units of "${items[i].itemName}" in stock`);
          }
          items[i].quantityRequested = req.body.order[i].quantity;
        }
        // checks that the user hasn't exceeded monthly/lifetime purchase limits for item
        const lifetimePurchaseHistory = await Order.findAllByUser(req.user.uuid);
        const oneMonthAgo = new Date().setMonth(new Date().getMonth() - 1);
        const pastMonthPurchaseHistory = lifetimePurchaseHistory.filter((o) => o.orderedAt > oneMonthAgo);
        const countOrderItems = (orders) => {
          const orderItemCounts = {};
          const orderedItems = Promise
            .all(orders.map((o) => OrderItem.findAllByOrder(o.uuid)))
            .then((ois) => flatten(ois));
          for (let i = 0; i < orderedItems.length; i += 1) {
            const oi = orderedItems[i];
            if (!(oi.uuid in orderItemCounts)) orderItemCounts[oi.uuid] = 0;
            orderItemCounts[oi.uuid] += 1;
          }
          return orderItemCounts;
        };
        const lifetimeOrderItemCounts = countOrderItems(lifetimePurchaseHistory);
        const pastMonthOrderItemCounts = countOrderItems(pastMonthPurchaseHistory);
        for (let i = 0; i < items.length; i += 1) {
          if (lifetimeOrderItemCounts[items[i].uuid] + items[i].quantityRequested > items[i].lifetimeLimit) {
            throw new error.UserError(`This order exceeds the lifetime limit for "${items[i].itemName}"`);
          }
          if (pastMonthOrderItemCounts[items[i].uuid] + items[i].quantityRequested > items[i].monthlyLimit) {
            throw new error.UserError(`This order exceeds the monthly limit for "${items[i].itemName}"`);
          }
        }
        // checks that the user has enough credits to place order
        const totalCost = items.reduce((sum, i) => sum + (i.getPrice() * i.quantityRequested), 0);
        const hasEnoughCredits = await User.hasEnoughCredits(req.user.uuid, totalCost);
        if (!hasEnoughCredits) throw new error.UserError('You don\'t have enough credits');
        // if all checks pass, the order is placed
        return Promise.all([
          Order.create({ user: req.user.uuid, totalCost })
            .then(async (o) => {
              const orderItems = flatten(req.body.order
                .map(({ item, quantity }) => Array(quantity).fill({ order: o.uuid, item })));
              await Promise.all([
                OrderItem.bulkCreate(orderItems),
                Activity.orderMerchandise(req.user.uuid, `Order ${o.uuid}`),
              ]);
              return pick(o, 'uuid', 'orderedAt', 'totalCost');
            }),
          Promise.all(items.map((i) => i.updateQuantity(i.quantityRequested))),
          req.user.spendCredits(totalCost),
        ]);
      });
      order.items = merch
        .filter((m) => m.quantityRequested > 0)
        .map((m) => ({ ...m, total: m.price * m.quantityRequested }))
        .map((m) => pick(m, ['itemName', 'price', 'picture', 'description', 'quantityRequested', 'total']));
      email.sendOrderConfirmation(req.user.email, req.user.firstName, order);
      res.json({ error: null, order });
    } catch (err) {
      next(err);
    }
  })

  /**
   * All further requests on this route require authentication and admin access.
   */
  .all((req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  /**
   * Given an 'orders' array of objects with 'uuid' and optional 'fulfilled' and 'notes' fields in the request
   * body, marks all order items as fulfilled if none of the order items have already been fulfilled, and
   * returns the number of items marked fulfilled.
   */
  .patch((req, res, next) => {
    const updatedOrderItemsLookup = {};
    for (let i = 0; i < req.body.items.length; i += 1) {
      const oi = req.body.items[i];
      updatedOrderItemsLookup[oi.uuid] = { fulfilled: Boolean(oi.fulfilled) };
      if (oi.notes) updatedOrderItemsLookup[oi.uuid].notes = oi.notes;
    }
    // a db transaction to ensure either all items are marked fulfilled or none are (request fails)
    db.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, (transaction) => Promise
      .all(req.body.items.map((o) => OrderItem.findByUUID(o.uuid)))
      .then((orderItems) => {
        const toBeFulfilled = req.body.items.filter((oi) => Boolean(oi.fulfilled)).map((oi) => oi.uuid);
        const alreadyFulfilled = orderItems.filter((oi) => oi.isFulfilled()).map((oi) => oi.uuid);
        if (intersection(toBeFulfilled, alreadyFulfilled).length > 0) {
          throw new error.UserError('At least one order item marked to be fulfilled has already been fulfilled.');
        }
        return orderItems;
      }).then((orderItems) => Promise.all(orderItems.map((oi) => {
        const updatedOrderItem = updatedOrderItemsLookup[oi.uuid];
        return OrderItem.fulfill(oi.uuid, updatedOrderItem.fulfilled, updatedOrderItem.notes);
      }))))
      .then((items) => res.json({ error: null, items }))
      .catch(next);
  });

module.exports = { router };
