const { pick } = require('underscore');

module.exports = (Sequelize, db) => {
  const MerchandiseCollection = db.define('MerchandiseCollection', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    description: {
      type: Sequelize.TEXT,
    },

  }, {
    indexes: [
      // for lookup by UUID
      {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
      },
    ],
  });

  MerchandiseCollection.findByUUID = function (uuid) {
    return this.findOne({ where: { uuid } });
  };

  MerchandiseCollection.getAllCollections = function () {
    return this.findAll();
  };

  MerchandiseCollection.destroyByUUID = function (uuid) {
    return this.destroy({ where: { uuid } });
  };

  MerchandiseCollection.sanitize = function (item) {
    return pick(item, ['title', 'description']);
  };

  return MerchandiseCollection;
};
