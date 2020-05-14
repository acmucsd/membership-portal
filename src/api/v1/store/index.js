const Sequelize = require('sequelize');
const express = require('express');
const { any, flatten, pick, intersection } = require('underscore');
const email = require('../../../email');
const error = require('../../../error');
const { Activity, User, MerchandiseCollection, Merchandise, Order, OrderItem, db } = require('../../../db');

const router = express.Router();

router.route('/collection/:uuid?')
  .get(async (req, res, next) => {
    try {
      if (req.params.uuid) {
        const collection = await MerchandiseCollection.findByUUID(req.params.uuid).then((c) => (c ? c.get() : c));
        if (!collection) return next(new error.NotFound('No such merchandise collection found'));
        const merchandise = await Merchandise.findAllByCollection(collection.uuid, req.user.isAdmin());
        collection.merchandise = req.user.isAdmin() ? merchandise : merchandise.map((m) => m.getPublicItem());
        res.json({ error: null, collection });
        return;
      }
      const findCollectionsMinusMerch = req.user.isAdmin()
        ? MerchandiseCollection.getAllCollections() : MerchandiseCollection.getAllUnarchivedCollections();
      const collectionsMinusMerch = await findCollectionsMinusMerch.then((cs) => cs.map((c) => c.get()));
      const collections = await Promise.all(collectionsMinusMerch
        .map((c) => Merchandise
          .findAllByCollection(c.uuid, req.user.isAdmin())
          .then((merchandise) => {
            merchandise = req.user.isAdmin() ? merchandise : merchandise.map((m) => m.getPublicItem());
            return { ...c, merchandise };
          })));
      res.json({ error: null, collections });
    } catch (err) {
      return next(err);
    }
  })

  /**
   * All further requests on this route require authentication and admin access.
   */
  .all((req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  .post(async (req, res, next) => {
    if (!req.body.collection) return next(new error.BadRequest('Merchandise collection must be provided'));

    try {
      const collection = await MerchandiseCollection.create(MerchandiseCollection.sanitize(req.body.collection));
      res.json({ error: null, collection });
    } catch (err) {
      return next(err);
    }
  })

  .patch(async (req, res, next) => {
    if (!req.params.uuid || !req.body.collection) {
      return next(new error.BadRequest('UUID and partial merchandise collection object must be provided'));
    }

    try {
      let collection = await MerchandiseCollection.findByUUID(req.params.uuid);
      if (!collection) return next(new error.BadRequest('No such merchandise collection found'));
      collection = await collection.update(MerchandiseCollection.sanitize(req.body.collection));
      res.json({ error: null, collection });
    } catch (err) {
      return next(err);
    }
  })

  .delete(async (req, res, next) => {
    if (!req.params.uuid) return next(new error.BadRequest('UUID must be provided'));

    try {
      const collection = await MerchandiseCollection.findByUUID(req.params.uuid);
      if (!collection) return next(new error.BadRequest('No such merchandise collection found'));
      const merchandise = await Merchandise.findAllByCollection(collection.uuid, req.user.isAdmin());
      const itemsHaveBeenOrdered = await Promise.all(merchandise.map((m) => OrderItem.itemHasBeenOrdered(m.uuid)));
      if (any(itemsHaveBeenOrdered)) {
        return next(new error.BadRequest('An item from this collection has been previous ordered'));
      }
      await Promise
        .all(merchandise.map((m) => Merchandise.destroyByUUID(m.uuid)))
        .then(() => MerchandiseCollection.destroyByUUID(collection.uuid));
      res.json({ error: null });
    } catch (err) {
      next(err);
    }
  });

router.route('/merchandise/:uuid?')

  /**
   * Given a merch item UUID in the URI, return the matching item or null if no such item was found.
   * Otherwise, returns all items listed on the store, including hidden items for admins.
   */
  .get(async (req, res, next) => {
    if (!req.params.uuid) return next(new error.BadRequest('UUID must be provided'));

    try {
      const merchandise = await Merchandise.findByUUID(req.params.uuid)
        .then((m) => (req.user.isAdmin() ? m : m.getPublicItem()));
      res.json({ error: null, merchandise });
    } catch (err) {
      return next(err);
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
   * Creates an item, given a 'merchandise' object in the request body, and returns the created item
   * upon success. Required fields: itemName, price, description. Optional fields: picture, quantity,
   * discountPercentage, hidden. All other fields will be ignored.
   */
  .post(async (req, res, next) => {
    if (!req.body.merchandise) return next(new error.BadRequest('Merchandise item must be provided'));

    try {
      const merchandise = await Merchandise.create(Merchandise.sanitize(req.body.merchandise));
      res.json({ error: null, merchandise });
    } catch (err) {
      return next(err);
    }
  })

  /**
   * Updates an item, given an item UUID in the URI and a 'merchandise' object in the request body, and
   * returns the updated item upon success. Optional fields: itemName, price, picture, description, addQuantity,
   * discountPercentage, hidden. All other fields will be ignored.
   */
  .patch(async (req, res, next) => {
    if (!req.params.uuid || !req.body.merchandise) {
      return next(new error.BadRequest('UUID and partial merchandise item object must be provided'));
    }

    try {
      let item = await Merchandise.findByUUID(req.params.uuid);
      if (!item) return next(new error.BadRequest('No such merchandise item found'));
      // reloads item to get the updated 'quantity' (see Merchandise::sanitize)
      item = await item.update(Merchandise.sanitize(req.body.merchandise)).then((i) => i.reload());
      res.json({ error: null, item });
    } catch (err) {
      return next(err);
    }
  })

  /**
   * Deletes an item, given an item UUID in the URI, if that item has not yet been ordered.
   */
  .delete(async (req, res, next) => {
    if (!req.params.uuid) return next(new error.BadRequest('UUID must be provided'));

    try {
      const item = await Merchandise.findByUUID(req.params.uuid);
      if (!item) return next(new error.BadRequest('No such merchandise item found'));
      const itemHasBeenOrdered = await OrderItem.itemHasBeenOrdered(req.params.uuid);
      if (itemHasBeenOrdered) {
        return next(new error.BadRequest('This item has been previously ordered and cannot be deleted.'));
      }
      await Merchandise.destroyByUUID(req.params.uuid);
      res.json({ error: null });
    } catch (err) {
      return next(err);
    }
  });

router.route('/order/:uuid?')

  /**
   * Given an order UUID in the URI, return the matching order or null if no such order was found.
   * Otherwise, returns all orders placed by the current user, or all orders if the user is an admin.
   */
  .get(async (req, res, next) => {
    try {
      if (req.params.uuid) {
        const order = await Order.findByUUID(req.params.uuid).then((o) => o.get());
        if (!req.user.isAdmin() && req.user.uuid !== order.user) {
          return next(new error.Forbidden());
        }
        order.items = await OrderItem.findAllByOrder(order.uuid);
        res.json({ error: null, order });
        return;
      }
      const findOrders = req.user.isAdmin() ? Order.getAllOrders() : Order.findAllByUser(req.user.uuid);
      const orders = Promise.all((await findOrders).map(async (o) => {
        o = o.get();
        o.items = await OrderItem.findAllByOrder(o.uuid);
        return o;
      }));
      res.json({ error: null, orders });
    } catch (err) {
      return next(err);
    }
  })

  /**
   * Places an order for the current user, given an 'order' array of objects with 'item' (UUID)
   * and 'quantity' fields in the request body, if the user has enough credits and there are enough
   * units of each item in stock.
   *
   * Error priority:
   *  1. purchase limits ("you are not allowed to order more and will not be allowed to")
   *  2. out of stock ("we cannot fulfill your current order for the time being")
   *  3. insufficient credits ("we can fulfill but you cannot pay for your current order")
   */
  .post(async (req, res, next) => {
    try {
      if (!req.body.order) return next(new error.BadRequest('Items list must be provided'));
      const orderIsEmpty = req.body.order.reduce(((x, n) => x + n.quantity), 0) === 0;
      if (orderIsEmpty) return next(new error.UserError('There are no items in this order'));
      const numUniqueUUIDs = (new Set(req.body.order.map((oi) => oi.uuid))).size;
      if (req.body.order.length !== numUniqueUUIDs) {
        return next(new error.BadRequest('There are duplicate or invalid items in this order'));
      }

      // a db transaction to ensure all values (e.g. units in stock, user's credits) are the most current
      const [order, merch] = await db.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      }, async (transaction) => {
        const items = await Promise.all(req.body.order.map((o) => Merchandise.findByUUID(o.item)));
        // checks that the user hasn't exceeded monthly/lifetime purchase limits for item
        const lifetimePurchaseHistory = await Order.findAllByUser(req.user.uuid);
        const oneMonthAgo = new Date().setMonth(new Date().getMonth() - 1);
        const pastMonthPurchaseHistory = lifetimePurchaseHistory.filter((o) => o.orderedAt > oneMonthAgo);
        const countOrderItems = async (orders) => {
          const orderItemCounts = {};
          const orderedItems = await Promise
            .all(orders.map((o) => OrderItem.findAllByOrder(o.uuid)))
            .then((ois) => flatten(ois));
          for (let i = 0; i < items.length; i += 1) {
            orderItemCounts[items[i].uuid] = 0;
          }
          for (let i = 0; i < orderedItems.length; i += 1) {
            const oi = orderedItems[i];
            if (oi.item in orderItemCounts) orderItemCounts[oi.item] += 1;
          }
          return orderItemCounts;
        };
        const lifetimeOrderItemCounts = await countOrderItems(lifetimePurchaseHistory);
        const pastMonthOrderItemCounts = await countOrderItems(pastMonthPurchaseHistory);
        for (let i = 0; i < items.length; i += 1) {
          items[i].quantityRequested = req.body.order[i].quantity;
          if (lifetimeOrderItemCounts[items[i].uuid] + items[i].quantityRequested > items[i].lifetimeLimit) {
            throw new error.UserError(`This order exceeds the lifetime limit for "${items[i].itemName}"`);
          }
          if (pastMonthOrderItemCounts[items[i].uuid] + items[i].quantityRequested > items[i].monthlyLimit) {
            throw new error.UserError(`This order exceeds the monthly limit for "${items[i].itemName}"`);
          }
        }
        // checks that enough units of requested items are in stock
        for (let i = 0; i < items.length; i += 1) {
          if (items[i].quantity < req.body.order[i].quantity) {
            throw new error.UserError(`There aren't enough units of "${items[i].itemName}" in stock`);
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
        .map((m) => pick(m, ['itemName', 'price', 'picture', 'description', 'quantityRequested']))
        .map((m) => ({ ...m, total: m.price * m.quantityRequested }));
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
   * Given an 'items' array of objects with 'uuid' and optional 'fulfilled' and 'notes' fields in the request
   * body, marks the appropriate order items as fulfilled if none of the order items that are set to be fulfilled
   * have already been fulfilled.
   */
  .patch(async (req, res, next) => {
    const updatedOrderItemsLookup = {};
    for (let i = 0; i < req.body.items.length; i += 1) {
      const oi = req.body.items[i];
      updatedOrderItemsLookup[oi.uuid] = { fulfilled: Boolean(oi.fulfilled) };
      if (oi.notes) updatedOrderItemsLookup[oi.uuid].notes = oi.notes;
    }

    try {
      // a db transaction to ensure either all items are marked fulfilled or none are (request fails)
      await db.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      }, async (transaction) => {
        const orderItems = await Promise.all(req.body.items.map((o) => OrderItem.findByUUID(o.uuid)));
        const toBeFulfilled = req.body.items.filter((oi) => Boolean(oi.fulfilled)).map((oi) => oi.uuid);
        const alreadyFulfilled = orderItems.filter((oi) => oi.isFulfilled()).map((oi) => oi.uuid);
        if (intersection(toBeFulfilled, alreadyFulfilled).length > 0) {
          throw new error.UserError('At least one order item marked to be fulfilled has already been fulfilled.');
        }
        return Promise.all(orderItems.map((oi) => {
          const updatedOrderItem = updatedOrderItemsLookup[oi.uuid];
          return OrderItem.fulfill(oi.uuid, updatedOrderItem.fulfilled, updatedOrderItem.notes);
        }));
      });
      res.json({ error: null });
    } catch (err) {
      return next(err);
    }
  });

module.exports = { router };
