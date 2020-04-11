const TABLE_NAME = 'Events';
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
      organization: {
        type: Sequelize.STRING,
        defaultValue: 'ACM',
      },
      committee: {
        type: Sequelize.STRING,
        defaultValue: 'ACM',
      },
      thumbnail: {
        type: Sequelize.STRING,
      },
      cover: {
        type: Sequelize.STRING,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      location: {
        type: Sequelize.STRING,
      },
      eventLink: {
        type: Sequelize.STRING,
      },
      start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      attendanceCode: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      pointValue: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
        name: 'event_start_end_index',
        fields: [{ attribute: 'start', order: 'ASC' }, { attribute: 'end', order: 'ASC' }],
        transaction: t,
      }),
      queryInterface.addIndex(TABLE_NAME, {
        using: 'BTREE',
        fields: ['committee'],
        transaction: t,
      }),
    ]))),

  down: (queryInterface, Sequelize) => queryInterface.dropTable('Events'),
};
