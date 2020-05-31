const config = require('../config');

const mediaTypes = {
  EVENT_COVER: 1,
  PROFILE_PICTURE: 2,
}

const getMediaTypeConfig = (mediaType) => {
  let mediaTypeConfig = {}
  switch(mediaType) {
    case mediaTypes.EVENT_COVER:
      mediaTypeConfig = {
        type: mediaTypes.EVENT_COVER,
        maxFileSize: config.file.MAX_EVENT_COVER_FILE_SIZE,
        uploadPath: config.file.EVENT_COVER_UPLOAD_PATH,
        fileTag: 'image',
      };
      break;
    case mediaTypes.PROFILE_PICTURE:
      mediaTypeConfig = {
        type: mediaTypes.PROFILE_PICTURE,
        maxFileSize: config.file.MAX_PROFILE_PICTURE_FILE_SIZE,
        uploadPath: config.file.EVENT_COVER_UPLOAD_PATH,
        fileTag: 'image'
      };
      break;
  }
  return mediaTypeConfig;
}

module.exports = { mediaTypes, getMediaTypeConfig };