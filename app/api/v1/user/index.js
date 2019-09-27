const express = require('express');
const error = require('../../../error');
const { User, Activity } = require('../../../db');

const router = express.Router();

/**
 * Gets user profile for current user.
 */
router.route('/')
  .get((req, res, next) => {
    res.json({ error: null, user: req.user.getUserProfile() });
  })

  /**
   * Updates user information, given a user object with fields to update and updated information, and
   * returns the updated pubic version of the user.
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
    if (req.body.user.graduationYear && !Number.isNaN(parseInt(req.body.user.graduationYear, 10))) {
      updatedUser.graduationYear = req.body.user.graduationYear;
    }

    // case: user wants to change password (has provided and confirmed new password)
    if (req.body.user.newPassword && req.body.user.confPassword) {
      if (req.body.user.newPassword !== req.body.user.confPassword) {
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
    } else if (!!req.body.user.newPassword ^ !!req.body.user.confPassword) {
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

/**
 * Gets the user's public activity (account creation, events attendances, etc).
 */
router.get('/activity', (req, res, next) => {
  Activity.getPublicStream(req.user.uuid).then((activity) => {
    res.json({ error: null, activity: activity.map((a) => a.getPublic()) });
  }).catch(next);
});

/**
 * All requests on this route require admin access.
 */
router.route('/milestone')
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

module.exports = { router };
