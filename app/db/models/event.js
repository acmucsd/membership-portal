const { pick } = require('underscore');

module.exports = (Sequelize, db) => {
  const Event = db.define('Event', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },

    // currently unused, but the organization that the event is for
    organization: {
      type: Sequelize.STRING,
      defaultValue: 'ACM',
      validate: {
        len: {
          args: [2, 255],
          msg: 'The organization name must be at between 2 and 255 characters long',
        },
      },
    },

    // committee hosting the event (NULL signifies general event)
    committee: {
      type: Sequelize.STRING,
      defaultValue: 'ACM',
    },

    // currently unused
    thumbnail: {
      type: Sequelize.STRING,
      validate: {
        isUrl: true,
      },
    },

    // URL for a (rectangular, larger) cover image, possible TODO set default value
    cover: {
      type: Sequelize.STRING,
      validate: {
        isUrl: true,
      },
    },

    title: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [3, 255],
          msg: 'The title must be between 3 and 255 characters long',
        },
        notEmpty: {
          msg: 'The title field is required',
        },
      },
    },

    description: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'The description field is required',
        },
      },
    },

    location: {
      type: Sequelize.STRING,
      validate: {
        len: {
          args: [3, 255],
          msg: 'The location must be between 3 and 255 characters long',
        },
      },
    },

    // link to a FB event, evite, etc.
    eventLink: {
      type: Sequelize.STRING,
      validate: {
        isUrl: true,
      },
    },

    // stored as UTC datetime string, not Pacific
    start: {
      type: Sequelize.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'The start date must be a UTC datetime string',
        },
        notEmpty: {
          msg: 'The start date is a required field',
        },
      },
    },

    // stored as UTC datetime string, not Pacific
    end: {
      type: Sequelize.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'The end date must be a UTC datetime string',
        },
        notEmpty: {
          msg: 'The end date is a required field',
        },
      },
    },

    // attendance code for the event (should be unique across all events)
    attendanceCode: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: {
        msg: 'This attendance code is already being used by another event',
      },
      validate: {
        len: {
          args: [3, 255],
          msg: 'The attendance code must be between 3 and 255 characters long',
        },
      },
    },

    // number of points attending this event is worth
    pointValue: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: {
          args: [0],
          msg: 'Event attendance cannot be worth fewer than 0 points',
        },
      },
    },

    // events should be soft-deleted by marking them as 'deleted' and then not serving them to the user
    // instead of deleting them from the database entirely
    deleted: {
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

      // a BTREE index on the start datetime -> retrieving all events in chronological order in O(n)
      {
        name: 'event_start_date_index',
        method: 'BTREE',
        fields: ['start', { attribute: 'start', order: 'DESC' }],
      },

      // a BTREE index on the end datetime -> retrieving all events in chronological order in O(n)
      {
        name: 'event_end_date_index',
        method: 'BTREE',
        fields: ['end', { attribute: 'end', order: 'DESC' }],
      },

      // a BTREE index on committee -> retrieving all events a committee is hosting in O(n)
      {
        name: 'committee_index',
        method: 'BTREE',
        fields: ['committee'],
      },
    ],
  });

  Event.getAll = function (offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    return this.findAll({ offset, limit, order: [['start', 'ASC']] });
  };

  Event.findByUUID = function (uuid) {
    return this.findOne({ where: { uuid } });
  };

  // TODO write custom attendanceCode validator and query to allow reusing attendance codes
  // (attendance codes must be unique to active events, but can reuse old attendance codes)
  Event.findByAttendanceCode = function (attendanceCode) {
    return this.findOne({ where: { attendanceCode } });
  };

  Event.eventExists = function (uuid) {
    return this.count({ where: { uuid } }).then((c) => c !== 0);
  };

  Event.destroyByUUID = function (uuid) {
    return this.destroy({ where: { uuid } });
  };

  Event.getCommitteeEvents = function (committee, offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    return this.findAll({ where: { committee }, offset, limit });
  };

  Event.getPastEvents = function (offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    const now = new Date();
    return this.findAll({ where: { start: { [Sequelize.Op.lt]: now } }, offset, limit, order: [['start', 'ASC']] });
  };

  Event.getFutureEvents = function (offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    const now = new Date();
    return this.findAll({ where: { start: { [Sequelize.Op.gte]: now } }, offset, limit, order: [['start', 'ASC']] });
  };

  Event.sanitize = function (event) {
    event = pick(event, [
      'committee', 'thumbnail', 'cover', 'title', 'description', 'location', 'eventLink', 'start', 'end',
      'attendanceCode', 'pointValue',
    ]);
    if (event.committee !== undefined && event.committee.length === 0) delete event.committee;
    return event;
  };

  Event.prototype.getPublic = function (admin) {
    return {
      uuid: this.getDataValue('uuid'),
      organization: this.getDataValue('organization'),
      committee: this.getDataValue('committee'),
      cover: this.getDataValue('cover'),
      title: this.getDataValue('title'),
      description: this.getDataValue('description'),
      location: this.getDataValue('location'),
      eventLink: this.getDataValue('eventLink'),
      start: this.getDataValue('start'),
      end: this.getDataValue('end'),
      attendanceCode: admin ? this.getDataValue('attendanceCode') : undefined,
      pointValue: this.getDataValue('pointValue'),
    };
  };

  return Event;
};
