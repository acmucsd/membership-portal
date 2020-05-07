const TABLE_NAME = 'OrderItems';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => queryInterface
    .createTable(TABLE_NAME, {
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
      },
      item: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      fulfilled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      fulfilledAt: {
        type: Sequelize.DATE,
      },
      notes: {
        type: Sequelize.TEXT,
      },
    }).then(() => Promise.all([
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        name: 'items_per_order_index',
        using: 'BTREE',
        fields: ['order'],
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('"OrderItems"'),
};
