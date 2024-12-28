import { DataSource } from 'typeorm';
import { dataSource } from '../../DataSource';

export class DatabaseConnection {
  private static dataSource: DataSource = null;

  public static async connect(): Promise<DataSource> {
    if (!DatabaseConnection.dataSource) {
      DatabaseConnection.dataSource = dataSource;

      await DatabaseConnection.dataSource.initialize();
    }
    return DatabaseConnection.dataSource;
  }

  public static async get(): Promise<DataSource> {
    return DatabaseConnection.connect();
  }

  public static async clear(): Promise<void> {
    const dataSource = await DatabaseConnection.get();
    await dataSource.transaction(async (txn) => {
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
    if (!DatabaseConnection.dataSource) return;
    await DatabaseConnection.dataSource.destroy();
  }
}