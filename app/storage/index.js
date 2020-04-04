const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const config = require('../config');

const s3 = new aws.S3({
  apiVersion: '2006-03-01',
  region: config.s3.region,
  credentials: config.s3.credentials,
});

const s3Upload = multer({
  storage: multerS3({
    s3,
    bucket: config.s3.bucket,
    acl: 'public-read',
    key: (req, file, next) => {
      next(null, `portal/profiles/${req.user.uuid}`);
    },
  }),
});

module.exports = s3Upload;
