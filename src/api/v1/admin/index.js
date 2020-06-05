const express = require('express');
const error = require('../../../error');
const Storage = require('../../../storage');

const router = express.Router();

/**
 * Uploads a specific banner image. Requires admin access
 */
router.post('/banner', Storage.bufferImageBlob(Storage.mediaTypes.BANNER, 'image'), async (req, res, next) => {
  if (!req.user.isAdmin()) return next(new error.Forbidden());
  if (!req.body.bannerType || !Storage.bannerTypes.includes(req.body.bannerType)) {
    return next(new error.BadRequest('bannerType must be provided in body and be a valid banner type'));
  }
  try {
    const { bannerType } = req.body;
    const banner = await Storage.upload(Storage.mediaTypes.BANNER, req.file, bannerType);
    res.json({ error: null, banner });
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
