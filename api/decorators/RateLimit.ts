import { createParamDecorator } from 'routing-controllers';
import RateLimit from 'express-rate-limit';

// Define your rate limit options
const rateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1, // limit each IP to 100 requests per windowMs
};

// Create a rate limiter instance
const limiter = RateLimit(rateLimitOptions);

// Define a decorator function to apply rate limiting
export function RateLimited() {
  return createParamDecorator({
    value: async ({ context }) => {
      await limiter(context.req, context.res, () => {});
      return true; // Or any other value you need
    },
  });
}