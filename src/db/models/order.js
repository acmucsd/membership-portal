module.exports = (Sequelize, db) => {
  const Order = db.define('Order', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    user: {
      type: Sequelize.UUID,
      allowNull: false,
      validate: {
        isUUID: {
          args: 4,
          msg: 'Invalid value for user UUID',
        },
        notEmpty: {
          msg: 'The user UUID is a required field',
        },
      },
    },

    totalCost: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
      },
    },

    orderedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
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

      // for retrieving all orders a user has placed
      {
        name: 'orders_per_user_index',
        using: 'BTREE',
        fields: ['user'],
      },

      // for retrieving all orders in reverse chronological order
      {
        name: 'recent_orders_index',
        using: 'BTREE',
        fields: [{ attribute: 'orderedAt', order: 'DESC' }],
      },
    ],
  });

  Order.getAllOrders = function (offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    return this.findAll({ offset, limit, order: [['orderedAt', 'DESC']] });
  };

  Order.findByUUID = function (uuid) {
    return this.findOne({ where: { uuid } });
  };

  Order.findAllByUser = function (user, offset, limit) {
    return this.findAll({ where: { user }, offset, limit, order: [['orderedAt', 'DESC']] });
  };

  return Order;
};
