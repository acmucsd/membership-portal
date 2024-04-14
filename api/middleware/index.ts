import { RequestLogger } from './RequestLogger';
import { ErrorHandler } from './ErrorHandler';
import { NotFoundHandler } from './NotFoundHandler';
import { MetricsRecorder } from './MetricsRecorder';

export * from './UserAuthentication';

// not including UserAuthentication middlewares as part of global middlewares because it depends on the route
export const middlewares = [
  ErrorHandler,
  NotFoundHandler,
  RequestLogger,
  MetricsRecorder,
];
