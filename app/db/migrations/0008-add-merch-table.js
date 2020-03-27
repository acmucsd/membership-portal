module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => queryInterface
    .createTable('"Merchandise"', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      itemName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      picture: {
        type: Sequelize.STRING,
      },
      price: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      description: {
        type: Sequelize.TEXT,
      },
      discountPercentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      numSold: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      hidden: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    }).then(() => Promise.all([
      queryInterface.addIndex('"Merchandise"', {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
        transaction: t,
      }),
      queryInterface.addIndex('"Merchandise"', {
        using: 'BTREE',
        fields: [{ attribute: 'discountPercentage', order: 'DESC' }],
        where: { discountPercentage: { [Sequelize.Op.gt]: 0 } },
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('"Merchandise"'),
};
