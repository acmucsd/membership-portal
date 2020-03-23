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

    fulfilled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    fulfilledAt: {
      type: Sequelize.DATE,
    },

  }, {
    indexes: [
      // a unique BTREE index on uuid -> lookup by UUID in O(log n)
      {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
      },

      // a BTREE index on order -> retrieving all items in an order in O(n)
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

  OrderItem.prototype.fulfill = function () {
    return this.update({ fulfilled: true, fulfilledAt: Date.now() });
  };

  return OrderItem;
};
