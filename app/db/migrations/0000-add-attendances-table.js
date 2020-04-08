const TABLE_NAME = 'Attendances';
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
      event: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    }).then(() => Promise.all([
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        fields: ['uuid'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        fields: ['user'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        fields: ['event'],
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('Attendances'),
};
