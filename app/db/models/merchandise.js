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

    price: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },

    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },

    description: {
      type: Sequelize.TEXT,
    },

    discountPercentage: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
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
  });

  Merchandise.findByUUID = function (uuid) {
    return this.findOne({ where: { uuid } });
  };

  Merchandise.getAllItems = function (offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    return this.findAll({ offset, limit });
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

  // TODO
  Merchandise.sellItems = function (order) {
    return this.decrement('quantity', {});
  };

  return Merchandise;
};
