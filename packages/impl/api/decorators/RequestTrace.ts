import { createParamDecorator } from 'routing-controllers';

export function RequestTrace() {
  return createParamDecorator({
    value: (action) => action.request.trace,
  });
}
