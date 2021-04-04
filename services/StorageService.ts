import { Service } from 'typedi';
import * as aws from 'aws-sdk';
import * as path from 'path';
import * as multer from 'multer';
import * as sharp from 'sharp';
import { InternalServerError } from 'routing-controllers';
import { Config } from '../config';
import { MediaType } from '../types';

type File = Express.Multer.File;
type FileOptions = multer.Options;

interface MediaTypeConfig {
  type: MediaType;
  maxFileSize: number;
  uploadPath: string;
  width?: number;
  height?: number;
}

@Service()
export default class StorageService {
  private s3 = new aws.S3({
    apiVersion: '2006-03-01',
    region: Config.s3.region,
    credentials: Config.s3.credentials,
  });

  public async upload(file: File, mediaType: MediaType, fileName: string): Promise<string> {
    const { uploadPath, width, height } = StorageService.getMediaConfig(mediaType);
    const isFileResizable = width && height;
    const fileBuffer = isFileResizable ? await StorageService.resizeFile(file, width, height) : file.buffer;

    const params = {
      ACL: 'public-read',
      Body: fileBuffer,
      Bucket: Config.s3.bucket,
      Key: `${uploadPath}/${fileName}${path.extname(file.originalname)}`,
    };
    const data = await this.s3.upload(params).promise();
    return data.Location;
  }

  public static getFileOptions(mediaType: MediaType): FileOptions {
    const mediaConfig = StorageService.getMediaConfig(mediaType);
    return {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: mediaConfig.maxFileSize,
      },
    };
  }

  private static getMediaConfig(type: MediaType): MediaTypeConfig {
    switch (type) {
      case MediaType.EVENT_COVER: {
        return {
          type: MediaType.EVENT_COVER,
          maxFileSize: Config.file.MAX_EVENT_COVER_FILE_SIZE,
          uploadPath: Config.file.EVENT_COVER_UPLOAD_PATH,
          width: Config.file.EVENT_COVER_WIDTH,
          height: Config.file.EVENT_COVER_HEIGHT,
        };
      }
      case MediaType.PROFILE_PICTURE: {
        return {
          type: MediaType.PROFILE_PICTURE,
          maxFileSize: Config.file.MAX_PROFILE_PICTURE_FILE_SIZE,
          uploadPath: Config.file.PROFILE_PICTURE_UPLOAD_PATH,
        };
      }
      case MediaType.BANNER: {
        return {
          type: MediaType.BANNER,
          maxFileSize: Config.file.MAX_BANNER_FILE_SIZE,
          uploadPath: Config.file.BANNER_UPLOAD_PATH,
        };
      }
      default: {
        throw new InternalServerError('Invalid media type for file');
      }
    }
  }

  private static async resizeFile(file: File, width: number, height: number): Promise<Buffer> {
    // resize the image, maintaining the original aspect ratio with the guarantee
    // that both dimensions are greater than or equal to the dimensions provided
    return sharp(file.buffer)
      .resize(width, height, { fit: 'outside' })
      .toBuffer();
  }
}
