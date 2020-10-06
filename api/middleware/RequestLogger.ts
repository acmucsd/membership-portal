import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as crypto from 'crypto';
import * as express from 'express';
import * as moment from 'moment';
import * as morgan from 'morgan';

@Middleware({ type: 'before' })
export class RequestLogger implements ExpressMiddlewareInterface {
  async use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    request.trace = crypto.randomBytes(16).toString('hex');
    morgan.token('date', () => `${moment().format('llll')} PT`);
    morgan.token('ip', () => `[IP ${request.headers['x-forwarded-for'] || '-'}]`);
    morgan.token('trace', () => `[Trace ${request.trace}]`);
    const logFn = morgan(':date :ip :trace :method :url :status :response-time[3]ms');
    logFn(request, response, next);
  }
}
