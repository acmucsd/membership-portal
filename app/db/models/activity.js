module.exports = (Sequelize, db) => {
  // non-trivial user actions within the system (e.g. logging in, updating info)
  const Activity = db.define('Activity', {
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

    // the type of action committed
    //   ACCOUNT_CREATE             - a user created an account
    //   ACCOUNT_ACTIVATE           - the user activated their account
    //   ACCOUNT_RESET_PASS         - the user reset their password
    //   ACCOUNT_RESET_PASS_REQUEST - the user requested a code to reset their password
    //   ACCOUNT_UPDATE_INFO        - the user updated some account information
    //   ACCOUNT_LOGIN              - the user logged into their account
    //   ATTEND_EVENT               - the user attended an event
    //   MILESTONE                  - a custom event (milestone)
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

    // some human-readable context/information regarding this activity
    description: {
      type: Sequelize.STRING,
    },

    // points earned as a result of this activity (if applicable)
    pointsEarned: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },

    date: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },

    // public or internal activity: public activities are shown to users and internal activities are used for logging
    public: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
  }, {
    indexes: [
      // a hash index on uuid -> lookup by UUID in O(1)
      {
        unique: true,
        fields: ['uuid'],
      },

      // a BTREE index on type -> retrieving activities by type O(n)
      {
        name: 'activity_type_btree_index',
        method: 'BTREE',
        fields: ['type', { attribute: 'type', order: 'ASC' }],
      },

      // a BTREE index on public -> retrieving public activities in O(n), where
      // n: number of public activities
      {
        name: 'activity_public_btree_index',
        method: 'BTREE',
        fields: ['public', { attribute: 'public', order: 'ASC' }],
      },

      // a BTREE index on date -> retrieving all events in chronological order in O(n)
      {
        name: 'activity_date_btree_index',
        method: 'BTREE',
        fields: ['date', { attribute: 'date', order: 'ASC' }],
      },

      // a BTREE index on user -> retrieving all events for a user in O(n), where
      // n: number of activities for given user
      {
        name: 'activity_user_btree_index',
        method: 'BTREE',
        fields: ['user', { attribute: 'user', order: 'ASC' }],
      },
    ],
  });

  Activity.accountCreated = function (user, description) {
    return this.create({
      user,
      description,
      type: 'ACCOUNT_CREATE',
      public: true,
    });
  };

  Activity.accountActivated = function (user, description) {
    return this.create({
      user,
      description,
      type: 'ACCOUNT_ACTIVATE',
    });
  };

  Activity.accountResetPassword = function (user, description) {
    return this.create({
      user,
      description,
      type: 'ACCOUNT_RESET_PASS',
    });
  };

  Activity.accountRequestedResetPassword = function (user, description) {
    return this.create({
      user,
      description,
      type: 'ACCOUNT_RESET_PASS_REQUEST',
    });
  };

  Activity.accountUpdatedInfo = function (user, description) {
    return this.create({
      user,
      description,
      type: 'ACCOUNT_UPDATE_INFO',
    });
  };

  Activity.accountLoggedIn = function (user, description) {
    return this.create({
      user,
      description,
      type: 'ACCOUNT_LOGIN',
    });
  };

  Activity.attendedEvent = function (user, description, pointsEarned) {
    return this.create({
      user,
      description,
      pointsEarned,
      type: 'ATTEND_EVENT',
      public: true,
    });
  };

  Activity.createMilestone = function (user, description, pointsEarned) {
    return this.create({
      user,
      description,
      pointsEarned,
      type: 'MILESTONE',
      public: true,
    });
  };

  Activity.getPublicStream = function (user) {
    return this.findAll({ where: { user, public: true }, order: [['date', 'ASC']] });
  };

  Activity.prototype.getPublic = function () {
    return {
      uuid: this.getDataValue('uuid'),
      user: this.getDataValue('user'),
      type: this.getDataValue('type'),
      date: this.getDataValue('date'),
      description: this.getDataValue('description'),
      pointsEarned: this.getDataValue('pointsEarned'),
    };
  };

  return Activity;
};
