module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.addColumn('"Events"', '"requiresStaff"', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      transaction: t,
    }),
    queryInterface.addColumn('"Events"', '"staffPointBonus"', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      transaction: t,
    }),
  ])),

  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => Promise.all([
    queryInterface.removeColumn('"Events"', '"requiresStaff"', { transaction: t }),
    queryInterface.removeColumn('"Events"', '"staffPointBonus"', { transaction: t }),
  ])),
};
