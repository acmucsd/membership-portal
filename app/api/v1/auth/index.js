const express = require('express');
const jwt = require('jsonwebtoken');
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
router.post('/register', (req, res, next) => {
  if (!req.body.user) return next(new error.BadRequest('User must be provided'));
  if (!req.body.user.password) return next(new error.BadRequest('Password must be provided'));
  if (req.body.user.password.length < 10) {
    return next(new error.BadRequest('Password should be at least 10 characters long'));
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

module.exports = { router, authenticated };
