import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as express from 'express';
import { rateLimit } from 'express-rate-limit';
// import { Config } from '../../config';

@Middleware({ type: 'before' })
export class RateLimiter implements ExpressMiddlewareInterface {
  private limiter = rateLimit({
    windowMs: 300000,
    max: 500,
    message: 'Too many requests, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  use(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.path === '/api/v1/admin') {
      return this.limiter(req, res, next);
    }
    return next();
  }
}
