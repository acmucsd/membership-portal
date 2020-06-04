const express = require('express');
const error = require('../../../error');
const Storage = require('../../../storage');

const router = express.Router();

/**
 * Uploads a specific banner image. Requires admin access
 */
router.post('/banner', Storage.bufferImageBlob(Storage.mediaTypes.BANNER, 'image'), async (req, res, next) => {
  if (!req.user.isAdmin()) return next(new error.Forbidden());
  try {
    const { bannerType } = req.body;
    const banner = await Storage.upload(Storage.mediaTypes.BANNER, req.file, bannerType);
    res.json({ error: null, banner });
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
