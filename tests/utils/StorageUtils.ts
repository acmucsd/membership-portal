import * as aws from 'aws-sdk';
import { Config } from '../../config';

export class StorageUtils {
  private s3Service = new aws.S3({
    apiVersion: '2006-03-01',
    region: Config.s3.region,
    credentials: Config.s3.credentials,
  });

  public async getAllFilesFromFolder(pathToFolder: string): Promise<aws.S3.ObjectList> {
    const { Contents } = await this.s3Service.listObjects({
      Bucket: Config.s3.bucket,
      Prefix: pathToFolder,
    }).promise();
    return Contents;
  }

  public async deleteAllFilesInFolder(pathToFolder: string) {
    const files = await this.getAllFilesFromFolder(pathToFolder);
    const objectsToDelete = files.map((file) => ({ Key: file.Key }));

    return this.s3Service.deleteObjects({
      Bucket: Config.s3.bucket,
      Delete: {
        Objects: objectsToDelete,
      },
    }).promise();
  }

  public static parseFirstFileNameFromFiles(files: aws.S3.ObjectList) {
    // ObjectList.Key is of format (path/to/fileName.jpg),
    // so need to split with ".", and then with "/"
    const pathWithoutExtension = files[0].Key.split('.')[0];
    const pathComponents = pathWithoutExtension.split('/');
    const fileName = pathComponents[pathComponents.length - 1];
    return fileName;
  }
}
