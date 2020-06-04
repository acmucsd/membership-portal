const config = require('../config');
const error = require('../error');

const mediaTypes = {
  EVENT_COVER: 1,
  PROFILE_PICTURE: 2,
  BANNER: 3,
};

const bannerTypes = [
  'main-banner',
];

const getMediaTypeConfig = (mediaType) => {
  switch (mediaType) {
    case mediaTypes.EVENT_COVER:
      return {
        type: mediaTypes.EVENT_COVER,
        maxFileSize: config.file.MAX_EVENT_COVER_FILE_SIZE,
        uploadPath: config.file.EVENT_COVER_UPLOAD_PATH,
      };
    case mediaTypes.PROFILE_PICTURE:
      return {
        type: mediaTypes.PROFILE_PICTURE,
        maxFileSize: config.file.MAX_PROFILE_PICTURE_FILE_SIZE,
        uploadPath: config.file.PROFILE_PICTURE_UPLOAD_PATH,
      };
    case mediaTypes.BANNER:
      return {
        type: mediaTypes.BANNER,
        maxFileSize: config.file.MAX_BANNER_FILE_SIZE,
        uploadPath: config.file.BANNER_UPLOAD_PATH,
      };
    default:
      throw new error.InternalServerError('Invalid media type for file');
  }
};

module.exports = { mediaTypes, bannerTypes, getMediaTypeConfig };
