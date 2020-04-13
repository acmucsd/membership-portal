const express = require('express');
const morgan = require('morgan');
const uuid = require('uuid');

const app = require('./app');

const log = app.logger;
const server = express();

// enable CORS
server.use((req, res, next) => {
  const regex = '.*\\.acmucsd\\.com';
  let allowedOrigin = 'https://acmucsd.com';
  if (app.config.isDevelopment) {
    allowedOrigin = '*';
  } else if (req.headers.origin.match(regex)) {
    allowedOrigin = req.headers.origin;
  }
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS');

  if (req.method.toLowerCase() === 'options') res.status(200).end();
  else next();
});

// assigns each request a uuid
server.use((req, res, next) => {
  req.id = uuid.v4().split('-').pop();
  res.set('X-Flow-Id', req.id);
  next();
});

// enables request logging
server.use(morgan(':date[web] [IP :req[X-Forwarded-For]] [Flow :res[X-Flow-Id]] '
  + ':method :url :status :response-time[3]ms'));

// parses urlencoded and JSON request data
server.use(express.urlencoded({ extended: true }));
server.use(express.json());

// routes the API
server.use('/api/', app.api.router);

// registers error middleware
server.use(app.db.errorHandler);
server.use(app.error.errorHandler);
server.use(app.error.notFoundHandler);

// ensures an admin account is created
app.db.initializeAdmin();

// starts the server
server.listen(app.config.port, () => {
  log.info('Started server on port %d.', app.config.port);
});
