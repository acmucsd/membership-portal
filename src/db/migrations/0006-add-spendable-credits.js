module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => queryInterface
    .addColumn('"Users"', 'credits', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      transaction: t,
    }).then(() => queryInterface.sequelize.query(
      'UPDATE "Users" SET credits = points * 100',
      { transaction: t },
    ))),

  down: (queryInterface, Sequelize) => queryInterface.removeColumn('"Users"', 'credits'),
};
