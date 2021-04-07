import { JsonController, Param, Params, Body, Get, Post, UseBefore } from 'routing-controllers';
import { Inject } from 'typedi';
import {
  RegistrationResponse,
  LoginResponse,
  VerifyAuthTokenResponse,
  ResetPasswordResponse,
  SendPasswordResetEmailResponse,
  VerifyEmailResponse,
  ResendEmailVerificationResponse,
} from 'types';
import UserAccountService from '../../services/UserAccountService';
import UserAuthService from '../../services/UserAuthService';
import { logger as log } from '../../utils/Logger';
import { RequestTrace } from '../decorators/RequestTrace';
import EmailService from '../../services/EmailService';
import { LoginRequest, RegistrationRequest, PasswordResetRequest } from '../validators/AuthControllerRequests';
import { authActionMetadata } from '../../utils/AuthActionMetadata';
import { OptionalUserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import { ValidEmail, ValidAccessCode } from '../../types/ApiParams';

@JsonController('/auth')
export class AuthController {
  @Inject()
  private userAccountService: UserAccountService;

  @Inject()
  private userAuthService: UserAuthService;

  @Inject()
  private emailService: EmailService;

  @Post('/registration')
  async register(@Body() registrationRequest: RegistrationRequest,
    @RequestTrace() trace: string): Promise<RegistrationResponse> {
    registrationRequest.user.email = registrationRequest.user.email.toLowerCase();
    const user = await this.userAuthService.registerUser(registrationRequest.user);
    this.emailService.sendEmailVerification(user.email, user.firstName, user.accessCode);
    log.info('user authentication (registration)', authActionMetadata(trace, user));
    return { error: null, user: user.getFullUserProfile() };
  }

  @Post('/login')
  async login(@Body() loginRequest: LoginRequest, @RequestTrace() trace: string): Promise<LoginResponse> {
    const user = await this.userAuthService.checkCredentials(loginRequest.email.toLowerCase(), loginRequest.password);
    const token = UserAuthService.generateAuthToken(user);
    log.info('user authentication (login)', authActionMetadata(trace, user));
    return { error: null, token };
  }

  @Get('/emailVerification/:email')
  async resendEmailVerification(@Params() vEmail: ValidEmail): Promise<ResendEmailVerificationResponse> {
    const user = await this.userAuthService.setAccessCode(vEmail.email.toLowerCase());
    await this.emailService.sendEmailVerification(user.email, user.firstName, user.accessCode);
    return { error: null };
  }

  @Post('/emailVerification/:accessCode')
  async verifyEmail(@Param('accessCode') accessCode: ValidAccessCode): Promise<VerifyEmailResponse> {
    await this.userAccountService.verifyEmail(accessCode.accessCode);
    return { error: null };
  }

  @Get('/passwordReset/:email')
  async sendPasswordResetEmail(@Params() vEmail: ValidEmail,
    @RequestTrace() trace: string): Promise<SendPasswordResetEmailResponse> {
    const user = await this.userAuthService.putAccountInPasswordResetMode(vEmail.email.toLowerCase());
    await this.emailService.sendPasswordReset(user.email, user.firstName, user.accessCode);
    log.info('user authentication (password reset - email)', authActionMetadata(trace, user));
    return { error: null };
  }

  @Post('/passwordReset/:accessCode')
  async resetPassword(@Param('accessCode') accessCode: string,
    @Body() passwordResetRequest: PasswordResetRequest,
    @RequestTrace() trace: string): Promise<ResetPasswordResponse> {
    const user = await this.userAuthService.resetPassword(accessCode, passwordResetRequest.user.newPassword);
    log.info('user authentication (password reset - access code)', authActionMetadata(trace, user));
    return { error: null };
  }

  @UseBefore(OptionalUserAuthentication)
  @Post('/verification')
  async verifyAuthToken(@AuthenticatedUser() user: UserModel): Promise<VerifyAuthTokenResponse> {
    log.info('user authentication (token verification)');
    const isValidAuthToken = !!user;
    return { error: null, authenticated: isValidAuthToken };
  }
}
