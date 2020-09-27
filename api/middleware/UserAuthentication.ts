import { ExpressMiddlewareInterface } from 'routing-controllers';
import * as express from 'express';
import { Inject } from 'typedi';
import UserAuthService from '../../services/UserAuthService';
import { authActionMetadata } from '../../utils/AuthActionMetadata';
import { logger as log } from '../../utils/Logger';

export class UserAuthentication implements ExpressMiddlewareInterface {
  @Inject()
  private userAuthService: UserAuthService;

  async use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    const authHeader = request.get('Authorization');
    request.user = await this.userAuthService.checkAuthToken(authHeader);
    log.info('user authentication (middleware)', authActionMetadata(request.trace, request.user));
    return next();
  }
}

export class OptionalUserAuthentication implements ExpressMiddlewareInterface {
  @Inject()
  private userAuthService: UserAuthService;

  async use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    const authHeader = request.get('Authorization');
    try {
      request.user = await this.userAuthService.checkAuthToken(authHeader);
      log.info('user authentication (middleware)', authActionMetadata(request.trace, request.user));
    } catch (error) {
      log.debug('optional user auth (middleware)');
    }
    return next();
  }
}
