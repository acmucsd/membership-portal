import { Service } from 'typedi';
import * as aws from 'aws-sdk';
import * as path from 'path';
import * as multer from 'multer';
import { ContentType, InternalServerError } from 'routing-controllers';
import { Config } from '../config';
import { MediaType } from '../types';

type File = Express.Multer.File;
type FileOptions = multer.Options;

interface MediaTypeConfig {
  type: MediaType;
  maxFileSize: number;
  uploadPath: string;
}

@Service()
export default class StorageService {
  private s3 = new aws.S3({
    apiVersion: '2006-03-01',
    region: Config.s3.region,
    credentials: Config.s3.credentials,
  });

  public async clearFolder(mediaType: MediaType, folder: string): Promise<string> {
    const { uploadPath } = StorageService.getMediaConfig(mediaType);
    const params = {
      Bucket: Config.s3.bucket,
      Prefix: `${uploadPath}/${folder}`,
    };

    const listedObjects = await this.s3.listObjectsV2(params).promise();

    if (listedObjects.Contents.length === 0) return;

    const deleteParams = {
      Bucket: Config.s3.bucket,
      Delete: { Objects: [] },
    };

    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key });
    });

    await this.s3.deleteObjects(deleteParams).promise();

    if (listedObjects.IsTruncated) await this.clearFolder(mediaType, folder);
  }

  public async upload(file: File, mediaType: MediaType, fileName: string): Promise<string> {
    const { uploadPath } = StorageService.getMediaConfig(mediaType);
    const params = {
      ACL: 'public-read',
      Body: file.buffer,
      Bucket: Config.s3.bucket,
      Key: `${uploadPath}/${fileName}${path.extname(file.originalname)}`,
    };
    const data = await this.s3.upload(params).promise();
    return data.Location;
  }

  public async uploadToFolder(file: File, mediaType: MediaType, fileName: string, folder: string): Promise<string> {
    const { uploadPath } = StorageService.getMediaConfig(mediaType);
    const params = {
      ACL: 'public-read',
      Body: file.buffer,
      Bucket: Config.s3.bucket,
      Key: `${uploadPath}/${folder}/${fileName}${path.extname(file.originalname)}`,
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
      case MediaType.MERCH_PHOTO: {
        return {
          type: MediaType.MERCH_PHOTO,
          maxFileSize: Config.file.MAX_MERCH_PHOTO_FILE_SIZE,
          uploadPath: Config.file.MERCH_PHOTO_UPLOAD_PATH,
        };
      }
      case MediaType.RESUME: {
        return {
          type: MediaType.RESUME,
          maxFileSize: Config.file.MAX_RESUME_FILE_SIZE,
          uploadPath: Config.file.RESUME_UPLOAD_PATH,
        };
      }
      default: {
        throw new InternalServerError('Invalid media type for file');
      }
    }
  }
}
