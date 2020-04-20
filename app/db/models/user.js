const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pick } = require('underscore');

const SALT_ROUNDS = 10;

module.exports = (Sequelize, db) => {
  const User = db.define('User', {
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
      unique: {
        msg: 'This email address is already in use',
      },
      validate: {
        isEmail: {
          msg: 'The email address you entered is not valid',
        },
        notEmpty: {
          msg: 'Your email address is a required field',
        },
      },
    },

    // TODO implement picture upload and set default value
    profilePicture: {
      type: Sequelize.STRING,
      validate: {
        isUrl: true,
      },
    },

    // account type
    //   RESTRICTED - unverified user / member
    //   STANDARD   - a regular ACM member
    //   STAFF      - a Diamond Staff member
    //   ADMIN      - admin type user
    accessType: {
      type: Sequelize.ENUM('PENDING', 'STANDARD', 'STAFF', 'ADMIN'),
      defaultValue: 'STANDARD',
    },

    // account state
    //   PENDING        - account pending activation (newly created)
    //   ACTIVE         - account activated and in good standing
    //   BLOCKED        - account is blocked -> login is denied
    //   PASSWORD_RESET - account has requested password reset
    state: {
      type: Sequelize.ENUM('PENDING', 'ACTIVE', 'BLOCKED', 'PASSWORD_RESET'),
      defaultValue: 'PENDING',
    },

    // code to be matched when activating account or resetting password
    accessCode: {
      type: Sequelize.STRING,
    },

    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 255],
          msg: 'Your first name must be at least 2 characters long',
        },
        notEmpty: {
          msg: 'Your first name is a required field',
        },
      },
    },

    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 255],
          msg: 'Your last name must be at least 2 characters long',
        },
        notEmpty: {
          msg: 'Your last name is a required field',
        },
      },
    },

    // password hash
    hash: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Your password cannot be empty',
        },
      },
    },

    graduationYear: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        notEmpty: {
          msg: 'Your graduation year is a required field',
        },
        isWithinSixYears(value) {
          const graduationYear = parseInt(value, 10);
          const currentYear = new Date().getFullYear();
          if (graduationYear < currentYear || graduationYear > currentYear + 6) {
            throw new Error('Your graduation year must be within the next 6 years');
          }
        },
      },
    },

    major: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 255],
          msg: 'Your major must be at least 2 characters long',
        },
        notEmpty: {
          msg: 'Your major is a required field',
        },
      },
    },

    points: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },

    lastLogin: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
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

      // for lookup by email and ensuring uniqueness
      {
        using: 'BTREE',
        unique: true,
        fields: ['email'],
      },

      // for lookup by access code and ensuring uniqueness
      {
        using: 'BTREE',
        unique: true,
        fields: ['accessCode'],
      },

      // for retrieving the leaderboard
      {
        name: 'leaderboard_index',
        using: 'BTREE',
        fields: [{ attribute: 'points', order: 'DESC' }],
      },
    ],
  });

  User.findByUUID = function (uuid) {
    return this.findOne({ where: { uuid } });
  };

  User.findByEmail = function (email) {
    return this.findOne({ where: { email } });
  };

  User.findByAccessCode = function (accessCode) {
    return this.findOne({ where: { accessCode } });
  };

  User.generateHash = function (password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  };

  User.generateAccessCode = function () {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, data) => {
        if (err) reject(err);
        resolve(data.toString('hex'));
      });
    });
  };

  // Verifies user's email by setting their account type to STANDARD if it is RESTRICTED
  User.prototype.validateEmail = function () {
    return this.update({ state: 'ACTIVE' });
  };

  User.getLeaderboard = function (offset, limit) {
    if (!offset || offset < 0) offset = 0;
    if (!limit || limit < 0) limit = undefined;
    return this.findAll({
      where: {
        [Sequelize.Op.and]: [
          { accessType: { [Sequelize.Op.not]: 'ADMIN' } },
          { state: { [Sequelize.Op.not]: 'PENDING' } },
          { state: { [Sequelize.Op.not]: 'BLOCKED' } },
        ],
      },
      offset,
      limit,
      order: [['points', 'DESC']],
    });
  };

  User.sanitize = function (user) {
    user = pick(user, ['profilePicture', 'email', 'firstName', 'lastName', 'graduationYear', 'major']);
    user.email = user.email.toLowerCase();
    return user;
  };

  User.prototype.addPoints = function (points) {
    return this.increment({ points });
  };

  User.prototype.updateProfilePicture = function (profilePicture) {
    return this.update({ profilePicture });
  };

  User.prototype.getPublicProfile = function () {
    return {
      firstName: this.getDataValue('firstName'),
      lastName: this.getDataValue('lastName'),
      profilePicture: this.getDataValue('profilePicture'),
      points: this.getDataValue('points'),
    };
  };

  User.prototype.getUserProfile = function () {
    return {
      uuid: this.getDataValue('uuid'),
      firstName: this.getDataValue('firstName'),
      lastName: this.getDataValue('lastName'),
      profilePicture: this.getDataValue('profilePicture'),
      email: this.getDataValue('email'),
      graduationYear: this.getDataValue('graduationYear'),
      major: this.getDataValue('major'),
      points: this.getDataValue('points'),
      state: this.getDataValue('state')
    };
  };

  User.prototype.verifyPassword = function (password) {
    return bcrypt.compare(password, this.getDataValue('hash'));
  };

  User.prototype.isAdmin = function () {
    return this.getDataValue('accessType') === 'ADMIN';
  };

  User.prototype.isStaff = function () {
    return this.getDataValue('accessType') === 'STAFF';
  };

  User.prototype.isStandard = function () {
    return this.getDataValue('accessType') === 'STANDARD';
  };

  User.prototype.isRestricted = function () {
    return this.getDataValue('accessType') === 'RESTRICTED';
  };

  User.prototype.isActive = function () {
    return this.getDataValue('state') === 'ACTIVE';
  };

  User.prototype.isPending = function () {
    return this.getDataValue('state') === 'PENDING';
  };

  User.prototype.isBlocked = function () {
    return this.getDataValue('state') === 'BLOCKED';
  };

  User.prototype.requestedPasswordReset = function () {
    return this.getDataValue('state') === 'PASSWORD_RESET';
  };

  return User;
};
