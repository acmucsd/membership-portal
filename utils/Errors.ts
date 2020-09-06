import { HttpError } from 'routing-controllers';

export class UserError extends HttpError {
  constructor(message: string) {
    super(400);
    this.message = message;
  }

  toJson() {
    return {
      status: this.httpCode,
      message: this.message,
    };
  }
}
