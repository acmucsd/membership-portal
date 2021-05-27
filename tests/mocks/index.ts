import { anything, instance, mock, when } from 'ts-mockito';
import StorageService from '../../services/StorageService';

export default class Mocks {
  public static storage(fileLocation: string) {
    const storageMock = mock(StorageService);
    when(storageMock.upload(anything(), anything(), anything())).thenResolve(fileLocation);
    return instance(storageMock);
  }
}
