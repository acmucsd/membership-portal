import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as express from 'express';
import * as metrics from 'datadog-metrics';

@Middleware({ type: 'before' })
export class MetricsRecorder implements ExpressMiddlewareInterface {
  async use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    metrics.increment('api_usage', 1, [`route:${request.url.split('/').join(':')}`, `method:${request.method}`]);
  }
}
