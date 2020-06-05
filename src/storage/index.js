const aws = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const Media = require('./media');

// sets maximum file size for profile pictures to 256 KB
const BYTES_PER_KILOBYTE = 1024;

const s3 = new aws.S3({
  apiVersion: '2006-03-01',
  region: config.s3.region,
  credentials: config.s3.credentials,
});

const upload = async (mediaType, file, fileName) => {
  const mediaTypeConfig = Media.getMediaTypeConfig(mediaType);
  const params = {
    ACL: 'public-read',
    Body: file.buffer,
    Bucket: config.s3.bucket,
    Key: `${mediaTypeConfig.uploadPath}/${fileName}${path.extname(file.originalname)}`,
  };
  return s3.upload(params).promise().then((data) => data.Location);
};

const bufferImageBlob = (mediaType, fileTag) => {
  const mediaTypeConfig = Media.getMediaTypeConfig(mediaType);
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: mediaTypeConfig.maxFileSize * BYTES_PER_KILOBYTE,
    },
  }).single(fileTag);
};


module.exports = { bufferImageBlob, upload, mediaTypes: Media.mediaTypes };
