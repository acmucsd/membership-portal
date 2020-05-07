const TABLE_NAME = 'Events';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.addColumn(TABLE_NAME, 'requiresStaff', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      transaction: t,
    }),
    queryInterface.addColumn(TABLE_NAME, 'staffPointBonus', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      transaction: t,
    }),
  ])),

  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.removeColumn(TABLE_NAME, 'requiresStaff', { transaction: t }),
    queryInterface.removeColumn(TABLE_NAME, 'staffPointBonus', { transaction: t }),
  ])),
};
