import 'reflect-metadata'; // this shim is required

import { createExpressServer } from 'routing-controllers';

import { Connection, createConnection } from 'typeorm';
import { models as entities } from './models';

import { Config } from './config';
import { InMemoryDatabaseCache } from './utils/InMemoryDatabaseCache';
import { logger as log } from './utils/Logger';
import { controllers } from './api/controllers';
import { middlewares } from './api/middleware';
import { TransactionManager } from './repositories';

async function createServer() {
  const connection: Connection = await createConnection({
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
  });
  
  log.info('created connection');

  const transactions = new TransactionManager(connection.manager);
}

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
