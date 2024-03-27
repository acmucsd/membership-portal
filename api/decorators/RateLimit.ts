import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

console.log("HELLO");

export function RateLimit(): MethodDecorator {
  return function (_target: any, _key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    console.log("originalMethod", originalMethod);
    descriptor.value = function (...args: any[]) {
      const context = args[0];
      limiter(context.req, context.res, () => {});
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}