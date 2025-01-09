import 'reflect-metadata'; // this shim is required
import Container from 'typedi';
import { createExpressServer, useContainer } from 'routing-controllers';
import { dataSource } from './DataSource';
import { Config } from './config';
import { controllers } from './api/controllers';
import { middlewares } from './api/middleware';

dataSource
  .initialize()
  .then(() => {
    console.log('created connection');
  })
  .catch((error) => {
    console.log(error);
  });

useContainer(Container);

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
