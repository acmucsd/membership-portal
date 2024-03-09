import { RequestLogger } from './RequestLogger';
import { ErrorHandler } from './ErrorHandler';
import { NotFoundHandler } from './NotFoundHandler';
import { MetricsRecorder } from './MetricsRecorder';
import { RateLimiter } from './RateLimiter';

export const middlewares = [
  ErrorHandler,
  NotFoundHandler,
  RequestLogger,
  MetricsRecorder,
  RateLimiter
];
