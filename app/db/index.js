const Sequelize = require('sequelize');
const cls = require('continuation-local-storage');

const logger = require('../logger');
const config = require('../config');
const error = require('../error');

const transactionNamespace = cls.createNamespace('portal-transaction-ns');
Sequelize.useCLS(transactionNamespace);

const db = new Sequelize(config.database.db, config.database.user, config.database.password, {
  dialect: config.database.dialect,
  host: config.database.host,
  logging: config.isDevelopment ? logger.debug : false,
});

/**
 * Handles database errors (separate from the general error handler and the 404 error handler)
 *
 * Specifically, it intercepts validation errors and presents them to the user in a readable
 * manner. All other errors it lets fall through to the general error handler middleware.
 */
const errorHandler = (err, req, res, next) => {
  if (!err || !(err instanceof Sequelize.Error)) return next(err);
  if (err instanceof Sequelize.ValidationError) {
    const message = `Validation Error: ${err.errors.map((e) => e.message).join('; ')}`;
    return next(new error.HTTPError(err.name, 422, message));
  }
  return next(new error.HTTPError(err.name, 500, err.message));
};

module.exports = { db, errorHandler };
