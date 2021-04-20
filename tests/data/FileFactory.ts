import { File } from '../../types';

const ONE_BYTE_FILLER = 'a';

// Factory for mocking in-memory files for testing with multer
export class FileFactory {
  public static image(size: number): File {
    const imageContents = ONE_BYTE_FILLER.repeat(size);
    const buffer = Buffer.from(imageContents);
    return {
      fieldname: 'image',
      originalname: 'image.jpg',
      filename: 'image.jpg',
      mimetype: 'image/jpg',
      buffer,
      encoding: '7bit',
      size,
      // the below fields are unused for in-memory multer storage but are still required by type def
      stream: null,
      destination: null,
      path: null,
    };
  }
}
