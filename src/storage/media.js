const config = require('../config');
const error = require('../error');

const mediaTypes = {
  EVENT_COVER: 1,
  PROFILE_PICTURE: 2,
};

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
        uploadPath: config.file.EVENT_COVER_UPLOAD_PATH,
      };
    default:
      throw new error.InternalServerError('Invalid media type for file');
  }
};

module.exports = { mediaTypes, getMediaTypeConfig };
