const TABLE_NAME = 'Merchandise';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => queryInterface
    .createTable(TABLE_NAME, {
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
      },
      collection: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      picture: {
        type: Sequelize.STRING,
      },
      price: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      discountPercentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
    }).then(() => Promise.all([
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        name: 'merchandise_collections_index',
        using: 'BTREE',
        fields: ['collection'],
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('"Merchandise"'),
};
