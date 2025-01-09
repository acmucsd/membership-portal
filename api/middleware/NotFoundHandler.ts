import { ExpressMiddlewareInterface, NotFoundError, Middleware } from 'routing-controllers';
import * as express from 'express';
import { handleError } from '../../error';
import { Service } from 'typedi';

@Service()
@Middleware({ type: 'after' })
export class NotFoundHandler implements ExpressMiddlewareInterface {
  use(request: express.Request, response: express.Response, next: express.NextFunction) {
    if (!response.headersSent) {
      const error = new NotFoundError(`The resource ${request.method} ${request.url} was not found`);
      handleError(error, request, response, next);
    }
    response.end();
  }
}
