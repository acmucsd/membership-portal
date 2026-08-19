import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
} from '../../metrics/prometheus';
import * as express from 'express';
import * as metrics from 'datadog-metrics';
import { Service } from 'typedi';

@Service()
@Middleware({ type: 'before', priority: 1 })
export class MetricsRecorder implements ExpressMiddlewareInterface {
  use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    const startedAt = process.hrtime.bigint();

    response.once('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      const labels = {
        method: request.method,
        route: request.route?.path ?? 'unmatched',
        status_code: response.statusCode.toString(),
      };

      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, durationSeconds);

      // Datadog Metrics Increment (to be phased out in the future)
      if (process.env.DATADOG_API_KEY || process.env.DD_API_KEY) {
        metrics.increment('membership_portal_api_usage', 1, [
          `route:${request.url}`,
          `method:${request.method}`,
          `status:${response.statusCode}`,
        ]);
      }
    });

    return next();
  }
}
