const express = require('express');
const morgan = require('morgan');
const uuid = require('uuid');

const config = require('./config');
const db = require('./db');
const error = require('./error');
const log = require('./logger');

const server = express();

// enable CORS
server.use((req, res, next) => {
  const regex = '.*\\.acmucsd\\.com';
  let allowedOrigin = 'https://acmucsd.com';
  if (config.isDevelopment) {
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
server.use('/api/', require('./api'));

// registers error middleware
server.use(db.errorHandler);
server.use(error.errorHandler);
server.use(error.notFoundHandler);

module.exports = server;
