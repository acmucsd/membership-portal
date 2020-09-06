import { JsonController, Param, Body, Get, Post, BodyParam } from 'routing-controllers';
import UserAccountService from '@Services/UserAccountService';
import { Inject } from 'typedi';
import UserAuthService from '@Services/UserAuthService';
import { logger as log } from 'utils/Logger';
import { RequestTrace } from 'api/decorators/RequestTrace';
import EmailService from '@Services/EmailService';
import { LoginRequest, RegistrationRequest, PasswordResetRequest } from '../validators/AuthControllerRequests';
import { authActionMetadata } from '../../utils/AuthActionMetadata';

@JsonController('/auth')
export class AuthController {
  @Inject()
  private userAccountService: UserAccountService;

  @Inject()
  private userAuthService: UserAuthService;

  @Inject()
  private emailService: EmailService;

  @Post('/registration')
  async register(@BodyParam('user') registrationRequest: RegistrationRequest, @RequestTrace() trace: string) {
    const user = await this.userAccountService.registerUser(registrationRequest);
    this.emailService.sendEmailVerification(user.email, user.firstName, user.accessCode);
    log.info('user authentication (registration)', authActionMetadata(trace, user));
    return { error: null, user: user.getFullUserProfile() };
  }

  @Post('/login')
  async login(@Body() loginRequest: LoginRequest, @RequestTrace() trace: string) {
    const user = await this.userAuthService.checkCredentials(loginRequest.email, loginRequest.password);
    const token = UserAuthService.generateAuthToken(user);
    log.info('user authentication (login)', authActionMetadata(trace, user));
    return { error: null, token };
  }

  @Get('/emailVerification/:email')
  async resendEmailVerification(@Param('email') email: string) {
    const user = await this.userAccountService.findByEmail(email);
    await this.userAuthService.changeAccessCode(user);
    await this.emailService.sendEmailVerification(user.email, user.firstName, user.accessCode);
    return { error: null };
  }

  @Post('/emailVerification/:accessCode')
  async verifyEmail(@Param('accessCode') accessCode: string) {
    const user = await this.userAccountService.findByAccessCode(accessCode);
    await user.markAsVerified();
    return { error: null };
  }

  @Get('/passwordReset/:email')
  async sendPasswordResetEmail(@Param('email') email: string, @RequestTrace() trace: string) {
    const user = await this.userAccountService.findByEmail(email);
    await this.userAuthService.setAccountStateToPasswordReset(user);
    await this.emailService.sendPasswordReset(user.email, user.firstName, user.accessCode);
    log.info('user authentication (password reset - email)', authActionMetadata(trace, user));
    return { error: null };
  }

  @Post('/passwordReset/:accessCode')
  async resetPassword(@Param('accessCode') accessCode: string,
    @Body() passwordResetRequest: PasswordResetRequest,
    @RequestTrace() trace: string) {
    const user = await this.userAuthService.resetPassword(accessCode, passwordResetRequest.user.newPassword);
    log.info('user authentication (password reset - access code)', authActionMetadata(trace, user));
    return { error: null };
  }
}
