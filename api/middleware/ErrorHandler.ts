import * as express from 'express';
import { ExpressErrorMiddlewareInterface, Middleware } from 'routing-controllers';
import { handleError } from '../../error';
import { Service } from 'typedi';

@Service()
@Middleware({ type: 'after' })
export class ErrorHandler implements ExpressErrorMiddlewareInterface {
  error(error: Error, request: express.Request, response: express.Response, next: (err?: any) => any): void {
    handleError(error, request, response, next);
  }
}
