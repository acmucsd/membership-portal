const aws = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const log = require('../logger');

// sets maximum file size for profile pictures to 256 KB
const BYTES_PER_KILOBYTE = 1024;

const s3 = new aws.S3({
  apiVersion: '2006-03-01',
  region: config.s3.region,
  credentials: config.s3.credentials,
});

const uploadToS3 = async (filePath, originalName, uuid) => {
  const fileData = fs.readFileSync(filePath);
  const params = {
    ACL: 'public-read',
    Body: fileData,
    Bucket: config.s3.bucket,
    Key: `portal/profiles/${uuid}${path.extname(originalName)}`,
  };
  const profileUrl = await s3.upload(params).promise()
    .then((data) => data.Location)
    .catch((error) => {
      log.warn(`Failed to upload profile picture to S3: ${error}`);
    });

  fs.unlinkSync(filePath);
  return profileUrl;
};

const getFileUpload = (fileTag, maxFileSize) => {
  const fileUpload = multer({
    dest: './src/storage/uploads',
    limits: {
      fileSize: maxFileSize * BYTES_PER_KILOBYTE,
    },
  }).single(fileTag);
  return fileUpload;
};


module.exports = { getFileUpload, uploadToS3 };
