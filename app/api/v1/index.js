const express = require('express');
let router = express.Router();

router.use('/hello', require('./hello').router);

module.exports = { router };
