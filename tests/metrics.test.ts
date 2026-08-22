import { EventEmitter } from 'events';
import * as express from 'express';
import { MetricsRecorder } from '../api/middleware/MetricsRecorder';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  metricsRegistry,
} from '../metrics/prometheus';

describe('Prometheus metrics', () => {
  beforeEach(() => {
    httpRequestsTotal.reset();
    httpRequestDurationSeconds.reset();
  });

  test('when metrics are exported, then the Prometheus content type is used', () => {
    expect(metricsRegistry.contentType).toBe('text/plain; version=0.0.4; charset=utf-8');
  });

  test('when a response finishes, then its count and duration are recorded', async () => {
    const request = {
      method: 'GET',
      route: { path: '/test' },
    } as express.Request;
    const response = Object.assign(new EventEmitter(), { statusCode: 200 }) as express.Response;

    new MetricsRecorder().use(request, response, jest.fn());
    response.emit('finish');

    const output = await metricsRegistry.metrics();
    expect(output).toContain(
      'http_server_requests_total{method="GET",route="/test",status_code="200",'
      + 'service="membership-portal"} 1',
    );
    expect(output).toContain(
      'http_server_request_duration_seconds_count{service="membership-portal",method="GET",'
      + 'route="/test",status_code="200"} 1',
    );
  });
});
