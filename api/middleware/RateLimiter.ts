import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as express from 'express';
import { rateLimit } from 'express-rate-limit';
// import { Config } from '../../config';

@Middleware({ type: 'before' })
export class RateLimiter implements ExpressMiddlewareInterface {
  private limiter = rateLimit({
    windowMs: 900000,
    max: 5,
  });

  use(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.path === '/api/v2/user') {
      return this.limiter(req, res, next);
    }

    return next();
  }
}
