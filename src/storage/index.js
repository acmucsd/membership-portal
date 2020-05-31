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

const uploadToS3 = async (mediaType, file, uuid) => {
  const mediaTypeConfig = Media.getMediaTypeConfig(mediaType);
  const params = {
    ACL: 'public-read',
    Body: file.buffer,
    Bucket: config.s3.bucket,
    Key: `portal/${mediaTypeConfig.uploadPath}/${uuid}${path.extname(file.originalname)}`,
  };
  return s3.upload(params).promise();
};

const bufferImageBlob = (mediaType) => {
  const mediaTypeConfig = Media.getMediaTypeConfig(mediaType);
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: mediaTypeConfig.maxFileSize * BYTES_PER_KILOBYTE,
    },
  }).single(mediaTypeConfig.fileTag);
};


module.exports = { bufferImageBlob, uploadToS3 };
