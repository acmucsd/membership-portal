const TABLE_NAME = 'Activities';
module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => queryInterface
    .createTable(TABLE_NAME, {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      user: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(
          'ACCOUNT_CREATE',
          'ACCOUNT_ACTIVATE',
          'ACCOUNT_RESET_PASS',
          'ACCOUNT_RESET_PASS_REQUEST',
          'ACCOUNT_UPDATE_INFO',
          'ACCOUNT_LOGIN',
          'ATTEND_EVENT',
          'MILESTONE',
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
      },
      pointsEarned: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      public: {
        type: Sequelize.BOOLEAN,
        default: false,
      },
    }).then(() => Promise.all([
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        name: 'public_activities_by_user_index',
        fields: ['user'],
        where: { public: true },
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('Users'),
};
