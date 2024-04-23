import { Connection, createConnection } from 'typeorm';
import { models as entities } from '@models';
import { Config } from '@config';

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
      // the order of elements matters here, since this will be the order of deletion.
      // if a table (A) exists with an fkey to another table (B), make sure B is listed higher than A.
      const tableNames = [
        'Activities',
        'OrderItems',
        'Orders',
        'OrderPickupEvents',
        'MerchandiseItemOptions',
        'MerchandiseItemPhotos',
        'MerchandiseItems',
        'MerchandiseCollections',
        'Attendances',
        'Users',
        'Events',
        'Feedback',
        'Resumes',
        'UserSocialMedia',
        'ExpressCheckins',
        'MerchCollectionPhotos',
      ];
      await Promise.all(tableNames.map((t) => txn.query(`DELETE FROM "${t}"`)));
    });
  }

  public static async close(): Promise<void> {
    if (!DatabaseConnection.conn) return;
    await DatabaseConnection.conn.close();
  }
}
