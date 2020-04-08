const TABLE_NAME = 'Attendances';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn(TABLE_NAME, '"asStaff"', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  }),

  down: (queryInterface, Sequelize) => queryInterface.removeColumn(TABLE_NAME, '"asStaff"'),
};
