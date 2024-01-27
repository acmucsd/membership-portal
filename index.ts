import 'reflect-metadata'; // this shim is required

import { createExpressServer, useContainer as routingUseContainer } from 'routing-controllers';

import { createConnection, useContainer as ormUseContainer } from 'typeorm';
import { Container } from 'typedi';
import { models as entities } from './models';

import { Config } from './config';
import { InMemoryDatabaseCache } from './utils/InMemoryDatabaseCache';
import { logger as log } from './utils/Logger';
import { controllers } from './api/controllers';
import { middlewares } from './api/middleware';

import { rateLimit } from 'express-rate-limit';

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1, // Limit each IP to 1 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

routingUseContainer(Container);
ormUseContainer(Container);

createConnection({
  type: 'postgres',
  host: Config.database.host,
  port: Config.database.port,
  username: Config.database.user,
  password: Config.database.pass,
  database: Config.database.name,
  entities,
  logging: Config.isDevelopment,
  cache: {
    provider(_connection) {
      return new InMemoryDatabaseCache();
    },
  },
}).then(() => {
  log.info('created connection');
}).catch((error) => {
  log.error(error);
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

app.use(limiter);

app.listen(Config.port);
