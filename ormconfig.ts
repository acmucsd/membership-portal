import { Config } from './config';
import { DatabaseNamingStrategy } from './config/DatabaseNamingStrategy';

const dbConfig = {
  type: 'postgres',
  host: Config.database.host,
  port: Config.database.port,
  username: Config.database.user,
  password: Config.database.pass,
  database: Config.database.name,
  uri: Config.database.uri,
  entities: [
    'models/*.ts',
  ],
  synchronize: false,
  namingStrategy: new DatabaseNamingStrategy(),
};

module.exports = [
  {
    ...dbConfig,
    migrations: [
      'migrations/*.ts',
    ],
    cli: {
      entitiesDir: 'models/',
      migrationsDir: 'migrations/',
    },
  },
  {
    ...dbConfig,
    name: 'seed',
    migrations: [
      'seeds/*.ts',
    ],
    migrationsTableName: 'seeds',
    cli: {
      entitiesDir: 'models/',
      migrationsDir: 'seeds/',
    },
  },
];
