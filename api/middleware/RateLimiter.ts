import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as express from 'express';
import { rateLimit } from 'express-rate-limit';


@Middleware({ type: 'before' })
export class RateLimiter implements ExpressMiddlewareInterface {
  async use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    console.log(request.ip);
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1, // Limit each IP to 1 requests per `window` (here, per 15 minutes)
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: true, // Disable the `X-RateLimit-*` headers
    });

    return next();
  }
}
