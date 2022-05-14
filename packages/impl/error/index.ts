import * as express from 'express';
import { ApiResponse, CustomErrorBody } from '@acmucsd/membership-portal-types';
import { HttpError } from 'routing-controllers';
import { Config } from '../config';
import { logger as log } from '../utils/Logger';

export function handleError(error: Error,
  request: express.Request,
  response: express.Response,
  next: express.NextFunction) {
  const { name, message, stack } = error;
  const httpCode = error instanceof HttpError ? error.httpCode : 500;
  const errorBody: CustomErrorBody = {
    ...error, // in case a library throws its own error (e.g. class-validator)
    name,
    message,
    httpCode,
  };
  if (Config.isDevelopment) {
    errorBody.stack = stack;
  }
  const errorResponse: ApiResponse = { error: errorBody };
  log.warn('%s [request %s]: %s [%d]: %s \n%s\n', new Date(), request.trace, name, httpCode, message, stack);
  response.status(httpCode).json(errorResponse);
  next();
}
