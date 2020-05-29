const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const config = require('../config');

// sets maximum file size for profile pictures to 256 KB
const BYTES_PER_KILOBYTE = 1024;

const s3 = new aws.S3({
  apiVersion: '2006-03-01',
  region: config.s3.region,
  credentials: config.s3.credentials,
});

const getFileUpload = (fileTag, maxFileSize) => {
  const fileUpload = multer({
    storage: multerS3({
      s3,
      bucket: config.s3.bucket,
      acl: 'public-read',
      key: (req, file, next) => {
        next(null, `portal/profiles/${req.user.uuid}${path.extname(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: maxFileSize * BYTES_PER_KILOBYTE,
    },
  }).single(fileTag);
  return fileUpload;
};


module.exports = { getFileUpload };
