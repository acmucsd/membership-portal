const TABLE_NAME = 'Users';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => queryInterface
    .addColumn(TABLE_NAME, 'credits', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      transaction: t,
    }).then(() => queryInterface.sequelize.query(
      `UPDATE ${TABLE_NAME} SET credits = points * 100`,
      { transaction: t },
    ))),

  down: (queryInterface, Sequelize) => queryInterface.removeColumn(TABLE_NAME, 'credits'),
};
