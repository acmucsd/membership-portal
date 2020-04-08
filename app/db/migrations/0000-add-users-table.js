const TABLE_NAME = 'Users';
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
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      profilePicture: {
        type: Sequelize.STRING,
      },
      accessType: {
        type: Sequelize.ENUM('RESTRICTED', 'STANDARD', 'ADMIN'),
        defaultValue: 'STANDARD',
      },
      state: {
        type: Sequelize.ENUM('PENDING', 'ACTIVE', 'BLOCKED', 'PASSWORD_RESET'),
        defaultValue: 'PENDING',
      },
      accessCode: {
        type: Sequelize.STRING,
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      graduationYear: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      major: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      points: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      lastLogin: {
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
        unique: true,
        fields: ['email'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        unique: true,
        fields: ['accessCode'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        name: 'leaderboard_index',
        using: 'BTREE',
        fields: [{ attribute: 'points', order: 'DESC' }],
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('Users'),
};
