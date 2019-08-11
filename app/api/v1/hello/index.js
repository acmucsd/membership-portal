const express = require('express');
const router = express.Router();

router.route('/')
.get((req, res, next) => {
	res.json({ hello: "world" });
});

module.exports = { router };
