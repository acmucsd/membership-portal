import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import * as express from 'express';
import { rateLimit } from 'express-rate-limit';
import { Config } from '../../config';


@Middleware({ type: 'before' })
export class RateLimiter implements ExpressMiddlewareInterface {
  private limiter = rateLimit({
    windowMs: Config.rateLimits.default.windowMs,
    max: Config.rateLimits.default.max,
  });

  use(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.path.includes('/api/v2/event')) {
      return this.limiter(req, res, next)
    }
    else {
      return next();
    }
    //return this.limiter(req, res, next);
  }
}
