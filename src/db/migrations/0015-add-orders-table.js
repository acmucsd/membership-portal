const TABLE_NAME = 'Orders';
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
      user: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      totalCost: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      orderedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    }).then(() => Promise.all([
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        name: 'orders_per_user_index',
        using: 'BTREE',
        fields: ['user'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        name: 'recent_orders_index',
        using: 'BTREE',
        fields: [{ attribute: 'orderedAt', order: 'DESC' }],
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('"Orders"'),
};
