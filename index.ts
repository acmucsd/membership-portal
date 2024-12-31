import 'reflect-metadata'; // this shim is required
import { createExpressServer, useContainer as routingUseContainer } from 'routing-controllers';
import { Container } from 'typedi';
import { dataSource } from './DataSource';
import { Config } from './config';
import { controllers } from './api/controllers';
import { middlewares } from './api/middleware';

routingUseContainer(Container);

dataSource
  .initialize()
  .then(() => {
    console.log('created connection');
  })
  .catch((error) => {
    console.log(error);
  });

const app = createExpressServer({
  cors: true,
  routePrefix: '/api/v2',
  controllers,
  middlewares,
  defaults: {
    paramOptions: {
      required: true,
    },
  },
  validation: {
    whitelist: true,
    skipMissingProperties: true,
    forbidUnknownValues: true,
  },
  defaultErrorHandler: false,
});

app.listen(Config.port);
