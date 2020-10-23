import { Connection, createConnection } from 'typeorm';
import Repositories from '../repositories';
import { Config } from '../config';
import { models as entities } from '../models';

export default class DatabaseConnection {
  private static conn: Connection = null;

  public static async connect(): Promise<DatabaseConnection> {
    if (!DatabaseConnection.conn) {
      DatabaseConnection.conn = await createConnection({
        type: 'postgres',
        host: Config.database.host,
        port: Config.database.port,
        username: Config.database.user,
        password: Config.database.pass,
        database: Config.database.name,
        entities,
      });
    }
    return new DatabaseConnection();
  }

  public static async get(): Promise<Connection> {
    DatabaseConnection.connect();
    return DatabaseConnection.conn;
  }

  public static async clear(): Promise<void> {
    await DatabaseConnection.conn.transaction(async (txn) => {
      const tableNames = [
        'Activities',
        'OrderItems',
        'Orders',
        'MerchandiseItemOptions',
        'MerchandiseItems',
        'MerchandiseCollections',
        'Attendances',
        'Users',
        'Events',
      ];
      await Promise.all(tableNames.map((t) => txn.query(`DELETE FROM "${t}"`)));
    });
  }

  public static async close(): Promise<void> {
    await DatabaseConnection.conn.close();
  }
}
