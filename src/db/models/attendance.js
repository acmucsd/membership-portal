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
    timestamp: {
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
    timestamps: false,
    indexes: [
      // for lookup by UUID
      {
        using: 'BTREE',
        unique: true,
        fields: ['uuid'],
      },

      // for retrieving all attendances for a user
      {
        using: 'BTREE',
        fields: ['user'],
      },

      // for retrieving all attendances for an event
      {
        using: 'BTREE',
        fields: ['event'],
      },
    ],
  });

  Attendance.getAttendanceForUser = function (user) {
    return this.findAll({ where: { user }, order: [['timestamp', 'ASC']] });
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
      timestamp: this.getDataValue('timestamp'),
      asStaff: this.getDataValue('asStaff'),
    };
  };

  return Attendance;
};
