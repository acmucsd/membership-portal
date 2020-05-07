module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => queryInterface
    .createTable('"OrderItems"', {
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
    }).then(() => Promise.all([
      queryInterface.addIndex('"OrderItems"', {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
        transaction: t,
      }),
      queryInterface.addIndex('"OrderItems"', {
        name: 'items_per_order_index',
        using: 'BTREE',
        fields: ['order'],
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('"OrderItems"'),
};
