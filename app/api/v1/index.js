const express = require('express');
const { authenticated } = require('./auth');

const router = express.Router();

router.use('/hello', authenticated, require('./hello').router);
router.use('/auth', require('./auth').router);

module.exports = { router };
