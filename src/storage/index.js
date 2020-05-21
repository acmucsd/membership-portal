const aws = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const fs = require('fs')

// sets maximum file size for profile pictures to 256 KB
const MAXIMUM_FILE_SIZE = 256 * 1024;

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
    Key: `portal/profiles_test/${uuid}${path.extname(originalName)}`,
  }
  const profile_url = await s3.upload(params).promise()
    .then((data) => {
      return data.Location
    })
    .catch((err) => {
      console.log(err)
    })

  fs.unlinkSync(filePath);
  return profile_url;
}

const upload = multer({
  dest: './src/storage/uploads',
  limits: {
    fileSize: MAXIMUM_FILE_SIZE
  }
})

module.exports = { upload, uploadToS3 };
