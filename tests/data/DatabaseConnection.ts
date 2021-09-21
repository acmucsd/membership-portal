import { Connection, createConnection } from 'typeorm';
import { Config } from '../../config';
import { models as entities } from '../../models';

export class DatabaseConnection {
  private static conn: Connection = null;

  public static async connect(): Promise<Connection> {
    if (!DatabaseConnection.conn) {
      DatabaseConnection.conn = await createConnection({
        type: 'postgres',
        host: Config.database.host,
        port: Config.database.port,
        username: Config.database.user,
        password: Config.database.pass,
        database: Config.database.name,
        entities,
        logging: false,
      });
    }
    return DatabaseConnection.conn;
  }

  public static async get(): Promise<Connection> {
    return DatabaseConnection.connect();
  }

  public static async clear(): Promise<void> {
    const conn = await DatabaseConnection.get();
    await conn.transaction(async (txn) => {
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
    if (!DatabaseConnection.conn) return;
    await DatabaseConnection.conn.close();
  }
}
