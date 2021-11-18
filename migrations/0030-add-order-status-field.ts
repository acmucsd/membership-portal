import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

const TABLE_NAME = 'Orders';

export class AddOrderStatusField1633030219180 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'status',
      type: 'varchar(255)',
      default: '\'PLACED\'',
    }));
    await queryRunner.createIndex(TABLE_NAME, new TableIndex({
      name: 'orders_by_status_index',
      columnNames: ['status'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, 'orders_by_status_index');
    await queryRunner.dropColumn(TABLE_NAME, 'status');
  }
}
