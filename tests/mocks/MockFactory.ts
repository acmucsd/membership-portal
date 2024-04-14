import { anything, mock, when } from 'ts-mockito';
import { StorageService } from '../../services';

const DEFAULT_FILE_URL = 'https://s3.amazonaws.com/default-file-url.pdf';

export class Mocks {
  public static storage(fileLocation = DEFAULT_FILE_URL): StorageService {
    const storageMock = mock(StorageService);
    when(storageMock.uploadToFolder(anything(), anything(), anything(), anything())).thenResolve(fileLocation);
    when(storageMock.deleteAtUrl(anything())).thenResolve();
    when(storageMock.upload(anything(), anything(), anything())).thenResolve(fileLocation);
    return storageMock;
  }
}
