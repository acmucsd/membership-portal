const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const uuid = require('uuid');

const app = require('./app');

const log = app.logger;
const server = express();

// enable CORS
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', app.config.isDevelopment ? '*' : 'https://acmucsd.com');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS');

  if (req.method.toLowerCase() === 'options') res.status(200).end();
  else next();
});

// assigns each request a uuid
server.use((req, res, next) => {
  req.id = uuid.v4().split('-').pop();
  next();
});

// enables logging
server.use(morgan(':date[web] [IP :req[X-Forwarded-For]] :method :url :status :response-time[3]ms'));

// parses urlencoded and JSON POST data
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

// routes the API
server.use('/api/', app.api.router);

// registers error middleware
server.use(app.db.errorHandler);
server.use(app.error.errorHandler);
server.use(app.error.notFoundHandler);

// initializes the database and populates for non-production environments
app.db.setup(app.config.isDevelopment, app.config.isDevelopment);

// starts the server
server.listen(app.config.port, () => {
  log.info('Started server on port %d.', app.config.port);
});
