import 'reflect-metadata'; // this shim is required

import { createExpressServer, useContainer as routingUseContainer } from 'routing-controllers';

import { createConnection, useContainer as ormUseContainer } from 'typeorm';
import { Container } from 'typedi';
import { models as entities } from './models';

import { Config } from './config';
import { RequestLogger } from './api/middleware/RequestLogger';
import { logger as log } from './utils/Logger';
import { controllers } from './api/controllers';

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
}).then(() => {
  log.info('created connection');
}).catch((error) => {
  log.error(error);
});

const app = createExpressServer({
  cors: true,
  routePrefix: '/api/v1',
  controllers,
  middlewares: [RequestLogger],
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
});

app.listen(Config.port);

/**

TODOS:
- paging
  - max page size
  - note all paging endpoints max out at 100
  - move offset/limit defaults to services
  - add back paging for leaderboard, event searches
- make merch store names consistent
- make sure all cascading deletes set up on ManyToOne cols, not nullable fkeys
- migrate db
  - run 'UPDATE "Activities" SET public = false WHERE public IS NULL' before migration
- API response types
- publishing types

maybe TODOs:
- remove soft deleting events?
- remove numSold from MerchItem
- FindEventOptions/EventSearchOptions, add more filters
- no new/confirm pass
- look into subqueries for ActivityRepo
- include payloads in returned errors (see NotFound in MerchStoreService::placeOrder
 */
