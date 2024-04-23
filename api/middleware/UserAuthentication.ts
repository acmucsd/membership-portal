import { ExpressMiddlewareInterface, ForbiddenError } from 'routing-controllers';
import * as express from 'express';
import { Inject } from 'typedi';
import { UserAuthService } from '@services';
import { authActionMetadata, logger as log } from '@utils';

export class UserAuthentication implements ExpressMiddlewareInterface {
  @Inject()
  private userAuthService: UserAuthService;

  async use(request: express.Request, response: express.Response, next?: express.NextFunction) {
    const authHeader = request.get('Authorization');
    if (!authHeader) throw new ForbiddenError('Missing auth token');
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
