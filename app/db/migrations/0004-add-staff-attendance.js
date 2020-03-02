module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn('"Attendances"', '"asStaff"', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  }),

  down: (queryInterface, Sequelize) => queryInterface.removeColumn('"Attendances"', '"asStaff"'),
};
