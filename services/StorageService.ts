import { Service } from 'typedi';
import * as aws from 'aws-sdk';
import * as path from 'path';
import * as multer from 'multer';
import { InternalServerError } from 'routing-controllers';
import AmazonS3URI = require('amazon-s3-uri');
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
export class StorageService {
  private s3 = new aws.S3({
    apiVersion: '2006-03-01',
    region: Config.s3.region,
    credentials: Config.s3.credentials,
  });

  public async deleteAtUrl(url: string) : Promise<void> {
    const { bucket, key } = AmazonS3URI(url);
    const deleteParams = {
      Bucket: bucket,
      Key: key,
    };

    await this.s3.deleteObject(deleteParams).promise();
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

  public static getRandomString(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';
    const stringLength = 25;
    // according to nanoID: ~611 trillion years needed, in order to have a 1%
    //                      probability of at least one collision.

    let result = '';
    for (let i = 0; i < stringLength; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
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
