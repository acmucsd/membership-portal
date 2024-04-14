import { Config, DatabaseNamingStrategy } from './config';

module.exports = {
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
  migrations: [
    'migrations/*.ts',
  ],
  cli: {
    entitiesDir: 'models/',
    migrationsDir: 'migrations/',
  },
};
