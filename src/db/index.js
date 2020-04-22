const Sequelize = require('sequelize');
const cls = require('continuation-local-storage');

const logger = require('../logger');
const config = require('../config');
const error = require('../error');

const transactionNamespace = cls.createNamespace('portal-transaction-ns');
Sequelize.useCLS(transactionNamespace);

const dialectOptions = !config.isDevelopment ? { ssl: true } : {};
const db = new Sequelize(config.database.db, config.database.user, config.database.password, {
  dialect: config.database.dialect,
  host: config.database.host,
  port: config.database.port,
  logging: config.isDevelopment ? logger.debug.bind(logger) : false,
  dialectOptions,
});

const User = require('./models/user')(Sequelize, db);
const Event = require('./models/event')(Sequelize, db);
const Activity = require('./models/activity')(Sequelize, db);
const Attendance = require('./models/attendance')(Sequelize, db);

/**
 * Adds the admin account if it doesn't exist.
 */
const initializeAdmin = () => User.findOrCreate({
  where: { email: config.admin.email },
  defaults: config.admin,
});

/**
 * Wraps database errors (e.g. validation) as predefined HttpErrors.
 */
const errorHandler = (err, req, res, next) => {
  if (!err || !(err instanceof Sequelize.Error)) return next(err);
  if (err instanceof Sequelize.ValidationError) {
    const message = `Validation Error: ${err.errors.map((e) => e.message).join('; ')}`;
    return next(new error.HttpError(err.name, 422, message));
  }
  return next(new error.HttpError(err.name, 500, err.message));
};

module.exports = { db, User, Event, Activity, Attendance, initializeAdmin, errorHandler };
