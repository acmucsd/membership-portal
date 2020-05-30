const aws = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const log = require('../logger');

// sets maximum file size for profile pictures to 256 KB
const BYTES_PER_KILOBYTE = 1024;

const s3 = new aws.S3({
  apiVersion: '2006-03-01',
  region: config.s3.region,
  credentials: config.s3.credentials,
});

const uploadToS3 = async (folder, file, uuid) => {
  const params = {
    ACL: 'public-read',
    Body: file.buffer,
    Bucket: config.s3.bucket,
    Key: `portal/${folder}/${uuid}${path.extname(file.originalname)}`,
  };
  const coverUrl = await s3.upload(params).promise()
    .then((data) => data.Location)
    .catch((error) => {
      log.warn(`Failed to upload profile picture to S3: ${error}`);
    });

  return coverUrl;
};

const getFile = (maxFileSize) => {
  const file = multer({
    limits: {
      fileSize: maxFileSize * BYTES_PER_KILOBYTE,
    },
  });
  return file;
};


module.exports = { getFile, uploadToS3 };
