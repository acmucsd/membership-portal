const Sequelize = require('sequelize');
const express = require('express');
const error = require('../../../error');
const { User, Activity, db } = require('../../../db');
const Storage = require('../../../storage');

const router = express.Router();

/**
 * Gets the current user's public activity (account creation, events attendances, etc).
 */
router.get('/activity', (req, res, next) => {
  Activity.getPublicStream(req.user.uuid).then((activity) => {
    res.json({ error: null, activity: activity.map((a) => a.getPublic()) });
  }).catch(next);
});

/**
 * Uploads a profile picture for the current user.
 */
router.post('/picture', (req, res, next) => {
  try {
    const fileUpload = Storage.getFileUpload('image', 256);
    fileUpload(req, res, async (err) => {
      if (err) next(err);
      if (req.file) {
        const { path, originalname } = req.file;
        const profileUrl = await Storage.uploadToS3(path, originalname, req.user.uuid);
        req.user.updateProfilePicture(profileUrl);
        res.json({ error: null, profileUrl });
      }
    });
  } catch (err) {
    next(err);
  }
});

router.route('/milestone')

  /**
   * All requests on this route require admin access.
   */
  .all((req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  /**
   * Create a milestone for all users.
   */
  .post((req, res, next) => {
    if (!req.body.milestone || !req.body.milestone.name || typeof req.body.milestone.name !== 'string') {
      return next(new error.BadRequest('Milestone object with name must be provided'));
    }

    User.findAll({}).then((users) => {
      users.forEach((user) => {
        Activity.createMilestone(user.uuid, req.body.milestone.name, user.points);
        if (req.body.milestone.resetPoints) {
          user.update({ points: 0 });
        }
      });
    }).then(() => res.json({ error: null })).catch(next);
  });

router.route('/bonus')

  /**
   * All requests on this route require admin access.
   */
  .all((req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  /**
   * Grants bonus points to some users given a 'bonus' object with an array
   * 'users' of email addresses, a 'points' field with the point value of
   * the bonus, and a 'description' field with some context for the bonus.
   */
  .post((req, res, next) => {
    if (!req.body.bonus || !req.body.bonus.description || typeof req.body.bonus.description !== 'string') {
      return next(new error.BadRequest('Bonus object with description must be provided'));
    }
    if (!req.body.bonus.users || !Array.isArray(req.body.bonus.users)) {
      return next(new error.BadRequest('Bonus object with users array must be provided'));
    }
    if (!req.body.bonus.points || req.body.bonus.points < 0) {
      return next(new error.BadRequest('Bonus object with non-negative point value must be provided'));
    }

    const { users: emails, description, points } = req.body.bonus;

    // use db transaction to ensure all operations go through (all changes rolled back
    // if any one operation fails, e.g. invalid email)
    return db.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, (transaction) => Promise.all(
      emails.map((address) => User.findByEmail(address).then((user) => Promise.all([
        Activity.grantBonusPoints(user.uuid, description, points),
        user.addPoints(points),
      ])).catch(() => {
        throw new error.BadRequest(`Something went wrong with email ${address}`);
      })),
    )).then(() => {
      res.json({ error: null, emails });
    }).catch((err) => next(err));
  });

router.route('/:uuid?')

  /**
   * Gets user profile for current user.
   */
  .get((req, res, next) => {
    if (!req.params.uuid || req.params.uuid === req.user.uuid) {
      res.json({ error: null, user: req.user.getUserProfile() });
      return;
    }
    User.findByUUID(req.params.uuid).then((user) => {
      res.json({ error: null, user: user.getPublicProfile() });
    }).catch(next);
  })

  /**
   * Updates user information, given a partial 'user' object in the request body, and returns
   * the user's updated public profile. Fields that may be updated: firstName, lastName, major,
   * graduationYear, bio. To update the password, the 'user' object must include matching 'newPassword'
   * and 'confirmPassword' fields.
   */
  .patch((req, res, next) => {
    if (!req.body.user) return next(new error.BadRequest('User object must be provided'));

    // constructs new, sanitized user object with updated fields
    const updatedUser = {};
    // for each of the required user fields, validate input and verify the value has changed
    const validateStringField = (updatedField) => updatedField && updatedField.length > 0;
    if (validateStringField(req.body.user.firstName) && req.body.user.firstName !== req.user.firstName) {
      updatedUser.firstName = req.body.user.firstName;
    }
    if (validateStringField(req.body.user.lastName) && req.body.user.lastName !== req.user.lastName) {
      updatedUser.lastName = req.body.user.lastName;
    }
    if (validateStringField(req.body.user.major) && req.body.user.major !== req.user.major) {
      updatedUser.major = req.body.user.major;
    }
    if (validateStringField(req.body.user.bio) && req.body.user.bio !== req.user.bio) {
      updatedUser.bio = req.body.user.bio;
    }
    if (req.body.user.graduationYear && !Number.isNaN(parseInt(req.body.user.graduationYear, 10))) {
      updatedUser.graduationYear = req.body.user.graduationYear;
    }

    // case: user wants to change password (has provided and confirmed new password)
    if (req.body.user.newPassword && req.body.user.confirmPassword) {
      if (req.body.user.newPassword !== req.body.user.confirmPassword) {
        return next(new error.UserError('Passwords do not match'));
      }
      if (req.body.user.newPassword.length < 10) {
        return next(new error.UserError('New password must be at least 10 characters'));
      }

      // verify that the current password is provided and correct
      req.user.verifyPassword(req.body.user.password).then((verified) => {
        if (!verified) throw new error.UserError('Incorrect current password');
        return User.generateHash(req.body.user.newPassword);
      }).then((hash) => {
        updatedUser.hash = hash;
        return req.user.update(updatedUser);
      }).then((user) => {
        res.json({ error: null, user: user.getPublicProfile() });
        Activity.accountUpdatedInfo(user.uuid, Object.keys(updatedUser).join(', '));
      })
        .catch(next);

    // case: user provided either new password or confirm password, but not both
    } else if (!!req.body.user.newPassword ^ !!req.body.user.confirmPassword) {
      return next(new error.UserError('Passwords do not match'));

    // case: user does not want to change password
    } else {
      // update the user information normally (with the given information, without any password changes)
      req.user.update(updatedUser).then((user) => {
        res.json({ error: null, user: user.getUserProfile() });
        Activity.accountUpdatedInfo(user.uuid, Object.keys(updatedUser).join(', '));
      }).catch(next);
    }
  });

module.exports = { router };
