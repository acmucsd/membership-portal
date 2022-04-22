import { createParamDecorator } from 'routing-controllers';

export function AuthenticatedUser() {
  return createParamDecorator({
    value: (action) => action.request.user,
  });
}
