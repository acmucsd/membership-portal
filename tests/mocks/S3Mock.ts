import { S3 } from 'aws-sdk';

export default class S3Mock {
  public static mockFileUploads() {
    return {
      S3: jest.fn(() => S3Mock.getS3Instance()),
    };
  }

  private static getS3Instance() {
    return {
      upload: S3Mock.mockUploadFunction,
    };
  }

  private static mockUploadFunction(params: S3.PutObjectRequest) {
    const { Bucket, Key } = params;
    const Location = `https://${Bucket}.s3.us-west-1.amazonaws.com/${Key}`;
    return {
      promise: jest.fn(() => ({ Location })),
    };
  }
}
