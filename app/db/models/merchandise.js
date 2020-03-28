const { pick } = require('underscore');

module.exports = (Sequelize, db) => {
  const Merchandise = db.define('Merchandise', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    itemName: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 255],
          msg: 'The item name must be at least 2 characters long',
        },
        notEmpty: {
          msg: 'The item name is a required field',
        },
      },
    },

    picture: {
      type: Sequelize.STRING,
      validate: {
        isUrl: true,
      },
    },

    price: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },

    discountPercentage: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    numSold: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },

    hidden: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    indexes: [
      // a unique BTREE index on uuid -> lookup by UUID in O(log n)
      {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
      },

      // a partial BTREE index on discount -> retrieving discounted inventory, sorted by highest discount, in O(n)
      {
        using: 'BTREE',
        fields: [{ attribute: 'discountPercentage', order: 'DESC' }],
        where: { discountPercentage: { [Sequelize.Op.gt]: 0 } },
      },
    ],
    freezeTableName: true,
    tableName: 'Merchandise',
  });

  Merchandise.findByUUID = function (uuid) {
    return this.findOne({ where: { uuid } });
  };

  Merchandise.getAllItems = function (isAdmin, offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    return this.findAll(isAdmin ? { offset, limit } : { where: { hidden: false }, offset, limit });
  };

  Merchandise.getDiscountedItems = function (offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    return this.findAll({
      where: { discountPercentage: { [Sequelize.Op.gt]: 0 } },
      offset,
      limit,
      order: [['discountPercentage', 'DESC']],
    });
  };

  Merchandise.sanitize = function (item) {
    // 'quantity' is incremented instead of directly set to avoid concurrency issues with orders
    delete item.quantity;
    if (item.addQuantity) item.quantity = Sequelize.literal(`quantity + ${item.addQuantity}`);
    return pick(item, ['itemName', 'picture', 'price', 'quantity', 'description', 'discountPercentage', 'hidden']);
  };

  Merchandise.destroyByUUID = function (uuid) {
    return this.destroy({ where: { uuid } });
  };

  Merchandise.prototype.getPrice = function () {
    const { price, discountPercentage } = this.get();
    return Math.round(price * (1 - (discountPercentage / 100)));
  };

  Merchandise.prototype.updateQuantity = function (quantity) {
    return this.decrement({ quantity, numSold: quantity * -1 });
  };

  return Merchandise;
};
