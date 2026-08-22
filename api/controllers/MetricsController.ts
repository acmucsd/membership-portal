import { ContentType, Controller, Get } from 'routing-controllers';
import { Service } from 'typedi';
import { metricsRegistry } from '../../metrics/prometheus';

@Service()
@Controller('/metrics')
export class MetricsController {
  @Get()
  @ContentType(metricsRegistry.contentType)
  getMetrics(): Promise<string> {
    return metricsRegistry.metrics();
  }
}
