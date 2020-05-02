const TABLE_NAME = 'Users';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn(TABLE_NAME, 'bio', {
    type: Sequelize.TEXT,
  }),

  down: (queryInterface, Sequelize) => queryInterface.removeColumn(TABLE_NAME, 'bio'),
};
