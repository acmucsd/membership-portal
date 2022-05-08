import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as express from 'express';
import * as metrics from 'datadog-metrics';

@Middleware({ type: 'after', priority: 1 })
export class MetricsRecorder implements ExpressMiddlewareInterface {
  async use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    metrics.increment('membership_portal_api_usage', 1, [
      `route:${request.url}`,
      `method:${request.method}`,
      `status:${response.statusCode}`,
    ]);
    return next();
  }
}
