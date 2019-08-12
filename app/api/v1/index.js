const express = require('express');

const router = express.Router();

router.use('/hello', require('./hello').router);

module.exports = { router };
