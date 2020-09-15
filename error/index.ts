import * as express from 'express';
import { CustomError } from 'types';
import { HttpError } from 'routing-controllers';
import { Config } from '../config';
import { logger as log } from '../utils/Logger';

export function handleError(error: Error,
  request: express.Request,
  response: express.Response,
  next: express.NextFunction) {
  const { name, message, stack } = error;
  const status = error instanceof HttpError ? error.httpCode : 500;
  const errorResponse: CustomError = {
    error: {
      name,
      message,
      status,
    },
  };
  if (Config.isDevelopment) {
    errorResponse.error.stack = stack;
  }
  log.warn('%s [request %s]: %s [%d]: %s \n%s', new Date(), request.trace, name, status, message, stack);
  response.status(status).json(errorResponse);
  next();
}
