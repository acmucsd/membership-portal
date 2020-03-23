module.exports = (Sequelize, db) => {
  const Attendance = db.define('Attendance', {
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
      validate: {
        isUUID: {
          args: 4,
          msg: 'Invalid value for user UUID',
        },
        notEmpty: {
          msg: 'The user UUID is a required field',
        },
      },
    },

    event: {
      type: Sequelize.UUID,
      allowNull: false,
      validate: {
        isUUID: {
          args: 4,
          msg: 'Invalid value for event UUID',
        },
        notEmpty: {
          msg: 'The event UUID is a required field',
        },
      },
    },

    // stored as UTC datetime string, not Pacific
    date: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },

    // if the user attended the event as a volunteer staff member
    asStaff: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

  }, {
    indexes: [
      // a hash index on uuid -> lookup by UUID in O(1)
      {
        unique: true,
        fields: ['uuid'],
      },

      // a hash index on user -> lookup by user in O(1)
      {
        unique: false,
        fields: ['user'],
      },

      // a hash index on event -> lookup by event in O(1)
      {
        unique: false,
        fields: ['event'],
      },

      // a BTREE index on date -> retrieving attendances in chronological order in O(n), where
      // n: number of attendance records
      {
        name: 'attendance_date_btree_index',
        method: 'BTREE',
        fields: ['date', { attribute: 'date', order: 'ASC' }],
      },

      // a BTREE index on user -> retrieving all attendances for a user in O(n), where
      // n: number of attendances for given user
      {
        name: 'attendance_user_btree_index',
        method: 'BTREE',
        fields: ['user', { attribute: 'user', order: 'ASC' }],
      },

      // a BTREE index on event -> retrieving all attendances for a event in O(n), where
      // n: number of attendances for given event
      {
        name: 'attendance_event_btree_index',
        method: 'BTREE',
        fields: ['event', { attribute: 'event', order: 'ASC' }],
      },
    ],
  });

  Attendance.getAttendanceForUser = function (user) {
    return this.findAll({ where: { user }, order: [['date', 'ASC']] });
  };

  Attendance.getAttendanceForEvent = function (event) {
    return this.findAll({ where: { event } });
  };

  Attendance.userAttendedEvent = function (user, event) {
    return this.count({ where: { user, event } }).then((c) => c !== 0);
  };

  Attendance.attendEvent = function (user, event, asStaff) {
    return this.create({ user, event, asStaff });
  };

  Attendance.prototype.getPublic = function () {
    return {
      uuid: this.getDataValue('uuid'),
      user: this.getDataValue('user'),
      event: this.getDataValue('event'),
      date: this.getDataValue('date'),
      asStaff: this.getDataValue('asStaff'),
    };
  };

  return Attendance;
};
