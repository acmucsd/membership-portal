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

    collection: {
      type: Sequelize.UUID,
      allowNull: false,
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

    monthlyLimit: {
      type: Sequelize.INTEGER,
    },

    lifetimeLimit: {
      type: Sequelize.INTEGER,
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
    timestamps: false,
    indexes: [
      // for lookup by UUID
      {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
      },

      // for retrieving discounted inventory, sorted by highest discount
      {
        using: 'BTREE',
        fields: [{ attribute: 'discountPercentage', order: 'DESC' }],
        where: { discountPercentage: { [Sequelize.Op.gt]: 0 } },
      },

      // for retrieving all items in a collection
      {
        name: 'merchandise_collections_index',
        using: 'BTREE',
        fields: ['collection'],
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

  Merchandise.findAllByCollection = function (collection) {
    return this.findAll({ where: { collection } });
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
    return pick(item, [
      'itemName',
      'collection',
      'picture',
      'price',
      'quantity',
      'description',
      'discountPercentage',
      'monthlyLimit',
      'lifetimeLimit',
      'hidden',
    ]);
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
