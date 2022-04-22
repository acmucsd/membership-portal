import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

const TABLE_NAME = 'OrderPickupEvents';

export class AddPickupEventStatusField1642898108471 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'status',
      type: 'varchar(255)',
      default: '\'ACTIVE\'',
    }));
    await queryRunner.createIndex(TABLE_NAME, new TableIndex({
      name: 'pickup_events_by_status_index',
      columnNames: ['status'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, 'pickup_events_by_status_index');
    await queryRunner.dropColumn(TABLE_NAME, 'status');
  }
}
