const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const uuid = require('uuid');

const app = require('./app');

const log = app.logger;
const server = express();

// assign each request a uuid
server.use((req, res, next) => {
  req.id = uuid.v4().split('-').pop();
  next();
});

// enable logging
server.use(morgan(':date[web] [IP :req[X-Forwarded-For]] :method :url :status :response-time[3]ms'));

// parse urlencoded and JSON POST data
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

// route the API
server.use('/api/', app.api.router);

// register error middleware
server.use(app.error.errorHandler);
server.use(app.error.notFoundHandler);

// start the server
server.listen(app.config.port, () => {
  log.info('Started server on port %d.', app.config.port);
});
