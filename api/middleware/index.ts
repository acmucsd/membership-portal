import { MetricsRecorder, RequestLogger } from './RequestLogger';
import { ErrorHandler } from './ErrorHandler';
import { NotFoundHandler } from './NotFoundHandler';

export const middlewares = [
  ErrorHandler,
  NotFoundHandler,
  RequestLogger,
  MetricsRecorder,
];
