import rateLimit from 'express-rate-limit';

export function RateLimit(limit: number): MethodDecorator {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: limit,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

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