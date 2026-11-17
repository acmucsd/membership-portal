import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as crypto from 'crypto';
import * as express from 'express';
import * as morgan from 'morgan';
import { Service } from 'typedi';
import { getTraceContext } from '../../utils/TraceContext';

@Service()
@Middleware({ type: 'before' })
export class RequestLogger implements ExpressMiddlewareInterface {
  async use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    const requestId = crypto.randomBytes(16).toString('hex');
    request.trace = requestId;
    // Capture before response completion, when the request's span may no longer be active.
    const traceContext = getTraceContext();
    const logFn = morgan((tokens, req, res) => JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'HTTP request',
      request_id: requestId,
      ...traceContext,
      ip: req.headers['x-forwarded-for'] || '-',
      method: req.method,
      url: tokens.url(req, res),
      status_code: Number(tokens.status(req, res)) || undefined,
      duration_ms: tokens['response-time'](req, res, '3'),
    }));
    logFn(request, response, next);
  }
}
