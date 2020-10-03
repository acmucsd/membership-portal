export * from './Enums';
export * from './ApiRequests';
export * from './ApiResponses';

export type File = Express.Multer.File;

export interface EventSearchOptions {
  offset?: number;
  limit?: number;
}
