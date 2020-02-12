const express = require('express');
const jwt = require('jsonwebtoken');
const email = require('../../../email');
const config = require('../../../config');
const error = require('../../../error');
const { User, Activity } = require('../../../db');

const router = express.Router();

const TOKEN_EXPIRES = 86400; // 1 day in seconds

/**
 * Middleware function that determines if a user is authenticated and assigns req.user to their user info from the db.
 * Auth header should be included in the 'Authorization' request header in the form of 'Bearer <TOKEN>'.
 */
const authenticated = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) return next(new error.Unauthorized());

  const authHead = authHeader.split(' ');
  const invalidAuthFormat = authHead.length !== 2 || authHead[0] !== 'Bearer' || authHead[1].length === 0;
  if (invalidAuthFormat) return next(new error.Unauthorized());

  const token = authHead[1];
  jwt.verify(token, config.auth.secret, (err, decoded) => {
    if (err) return next(new error.Unauthorized());

    User.findByUUID(decoded.uuid).then((user) => {
      if (!user) throw new error.Unauthorized();
      req.user = user;
    }).then(next).catch(next);
  });
};

/**
 * Authenticates a user, given 'email' and 'password' fields in the request body, and returns an
 * auth token on success.
 */
router.post('/login', (req, res, next) => {
  if (!req.body.email || req.body.email.length === 0) return next(new error.BadRequest('Email must be provided'));
  if (!req.body.password || req.body.password.length === 0) {
    return next(new error.BadRequest('Password must be provided'));
  }

  let userUuid = null;
  return User.findByEmail(req.body.email.toLowerCase()).then((user) => {
    if (!user) throw new error.UserError('There is no account associated with that email');
    if (user.isPending()) {
      throw new error.Unauthorized('Please activate your account. Check your email for an activation email');
    }
    if (user.isBlocked()) throw new error.Forbidden('Your account has been blocked');

    return user.verifyPassword(req.body.password).then((verified) => {
      if (!verified) throw new error.UserError('Incorrect password');
      userUuid = user.uuid;
    }).then(() => new Promise((resolve, reject) => {
      jwt.sign({
        uuid: user.getDataValue('uuid'),
        admin: user.isAdmin(),
      }, config.auth.secret, { expiresIn: TOKEN_EXPIRES }, (err, token) => (err ? reject(err) : resolve(token)));
    }));
  }).then((token) => {
    res.json({ error: null, token });
    Activity.accountLoggedIn(userUuid);
  }).catch(next);
});

/**
 * Registers new users, given a 'user' object in the request body, and returns the public
 * profile of the created user on success. Required 'user' fields: email, firstName, lastName,
 * password, graduationYear, major. Optional 'user' fields: profilePicture (not currently supported).
 * All other fields will be ignored.
 */
// TODO 'register' -> 'registration' (REST routes should use nouns)
router.post('/register', (req, res, next) => {
  if (!req.body.user) return next(new error.BadRequest('User must be provided'));
  if (!req.body.user.password) return next(new error.BadRequest('Password must be provided'));
  if (req.body.user.password.length < 10) {
    return next(new error.BadRequest('Password must be at least 10 characters long'));
  }

  // TODO account activation via email
  const newUser = User.sanitize(req.body.user);
  newUser.state = 'ACTIVE';
  User.generateHash(req.body.user.password).then((hash) => {
    newUser.hash = hash;
    return User.create(newUser);
  }).then((user) => {
    res.json({ error: null, user: user.getPublicProfile() });
    Activity.accountCreated(user.uuid);
  }).catch(next);
});

/**
 * Emails the user a reset password link, given an email in the URI.
 */
// TODO 'resetPassword' -> 'passwordReset' (REST routes should use nouns)
router.get('/resetPassword/:email', (req, res, next) => {
  User.findByEmail(req.params.email).then((user) => {
    if (!user) throw new error.NotFound('Invalid user');
    if (user.isBlocked()) throw new error.Forbidden('Your account has been blocked');
    if (user.isPending()) throw new error.Unprocessable('You must activate your account first');

    return User.generateAccessCode().then((code) => {
      user.accessCode = code;
      user.state = 'PASSWORD_RESET';
      return email.sendPasswordReset(user.email, user.firstName, code);
    }).then(() => user.save());
  }).then((user) => {
    res.json({ error: null });
    Activity.accountRequestedResetPassword(user.uuid);
  }).catch(next);
});

/**
 * Resets a user's password, given the emailed access code in the URI and a 'user' object
 * with 'newPassword' and 'confirmPassword' fields in the request body.
 */
// TODO 'resetPassword' -> 'passwordReset' (REST routes should use nouns)
router.post('/resetPassword/:accessCode', (req, res, next) => {
  if (!req.params.accessCode) return next(new error.BadRequest('Access code must be provided'));
  if (!req.body.user || !req.body.user.newPassword || !req.body.user.confirmPassword) {
    return next(new error.BadRequest('User object with new and confirmed passwords must be provided'));
  }
  if (req.body.user.newPassword !== req.body.user.confirmPassword) {
    return next(new error.UserError('Passwords do not match'));
  }
  if (req.body.user.newPassword.length < 10) {
    return next(new error.UserError('Password must be at least 10 characters'));
  }

  User.findByAccessCode(req.params.accessCode).then((user) => {
    // if no such user was found, the access code must be invalid/non-existent
    if (!user || !user.requestedPasswordReset()) throw new error.BadRequest('Invalid access code');
    return User.generateHash(req.body.user.newPassword).then((hash) => {
      user.hash = hash;
      user.state = 'ACTIVE';
      return user.save();
    });
  }).then((user) => {
    res.json({ error: null });
    Activity.accountResetPassword(user.uuid);
  }).catch(next);
});

/**
 * Verifies a user's auth token, given the token in the 'Authorization' request header in the form of 'Bearer <TOKEN>'.
 * Responds with a JSON object with fields 'error', 'authenticated' (if a user's token is valid), and 'admin' (if the
 * user is an admin).
 */
router.post('/verification', (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) return res.json({ error: 'Auth token must be specified', authenticated: false, admin: false });

  const authHead = authHeader.split(' ');
  const invalidAuthFormat = authHead.length !== 2 || authHead[0] !== 'Bearer' || authHead[1].length === 0;
  if (invalidAuthFormat) return res.json({ error: 'Invalid auth token format', authenticated: false, admin: false });

  const token = authHead[1];
  jwt.verify(token, config.auth.secret, (err, decoded) => {
    if (err) return res.json({ error: 'Invalid auth token', authenticated: false, admin: false });

    User.findByUUID(decoded.uuid).then((user) => {
      if (!user) return res.json({ error: null, authenticated: false, admin: false });
      res.json({ error:null, authenticated: true, admin: user.isAdmin() });
    }).then(next).catch(next);
  });
});

module.exports = { router, authenticated };
