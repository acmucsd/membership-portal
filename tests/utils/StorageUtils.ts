import { EventModel } from 'models/EventModel';
import { File } from 'types';
import * as path from 'path';
import { Config } from '../../config';

export class StorageUtils {
  public static getExpectedUploadPath(event: EventModel, cover: File): string {
    return `https://${Config.s3.bucket}.s3.${Config.s3.region}.amazonaws.com/`
      + `${Config.file.EVENT_COVER_UPLOAD_PATH}`
      + `/${event.uuid}${path.extname(cover.originalname)}`;
  }
}
