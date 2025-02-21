import Container from 'typedi';
import { DataSource } from 'typeorm';
import { models } from './models';

require('dotenv').config();

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.RDS_HOST,
  port: Number(process.env.RDS_PORT),
  username: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE,
  entities: models,
  migrations: ['/migrations/*.ts'],
  // synchronize: true, // DO NOT USE IN PRODUCTION, make migrations
});

// important for dependency injection for repositories
Container.set(DataSource, dataSource);
