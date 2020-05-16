module.exports = (Sequelize, db) => {
  const OrderItem = db.define('OrderItem', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    order: {
      type: Sequelize.UUID,
      allowNull: false,
      validate: {
        isUUID: {
          args: 4,
          msg: 'Invalid value for order UUID',
        },
        notEmpty: {
          msg: 'The order UUID is a required field',
        },
      },
    },

    item: {
      type: Sequelize.UUID,
      allowNull: false,
      validate: {
        isUUID: {
          args: 4,
          msg: 'Invalid value for item UUID',
        },
        notEmpty: {
          msg: 'The item UUID is a required field',
        },
      },
    },

    salePriceAtPurchase: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    discountPercentageAtPurchase: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    fulfilled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    fulfilledAt: {
      type: Sequelize.DATE,
    },

    notes: {
      type: Sequelize.TEXT,
    },

  }, {
    timestamps: false,
    indexes: [
      // for lookup by UUID
      {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
      },

      // for retrieving all items in an order
      {
        name: 'items_per_order_index',
        using: 'BTREE',
        fields: ['order'],
      },

    ],
  });

  OrderItem.findByUUID = function (uuid) {
    return this.findOne({ where: { uuid } });
  };

  OrderItem.findAllByOrder = function (order) {
    return this.findAll({ where: { order } });
  };

  OrderItem.itemHasBeenOrdered = function (item) {
    return this.count({ where: { item } }).then((c) => c !== 0);
  };

  OrderItem.fulfill = function (uuid, fulfilled, notes) {
    const changes = fulfilled ? { fulfilled, fulfilledAt: Date.now() } : {};
    if (notes) changes.notes = notes;
    return this.update(changes, { where: { uuid } });
  };

  OrderItem.prototype.isFulfilled = function () {
    return this.fulfilled;
  };

  return OrderItem;
};
