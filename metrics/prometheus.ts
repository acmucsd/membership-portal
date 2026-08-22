import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

// Create registry
export const metricsRegistry = new Registry();

metricsRegistry.setDefaultLabels({
  service: 'membership-portal',
});

// Get Node.js default metrics
collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'membership_portal_',
});

// Counter for number of httpRequest's
export const httpRequestsTotal = new Counter({
  name: 'http_server_requests_total',
  help: 'Total number of HTTP requests handled',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
});

// Histogram for request durations
export const httpRequestDurationSeconds = new Histogram({
  name: 'http_server_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});
