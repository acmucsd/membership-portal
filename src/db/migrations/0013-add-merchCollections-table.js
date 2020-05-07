const TABLE_NAME = 'MerchandiseCollections';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => queryInterface
    .createTable(TABLE_NAME, {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
    }).then(() => queryInterface.addIndex(TABLE_NAME, {
      using: 'BTREE',
      unique: true,
      fields: ['uuid'],
      transaction: t,
    }))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable(TABLE_NAME),
};
