import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

const TABLE_NAME = 'Orders';

export class AddOrderPickupEventField1631941813500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'pickupEvent',
      isNullable: true,
      type: 'uuid',
    }));
    await queryRunner.createForeignKey(TABLE_NAME, new TableForeignKey({
      columnNames: ['pickupEvent'],
      referencedTableName: 'OrderPickupEvents',
      referencedColumnNames: ['uuid'],
      onDelete: 'SET NULL',
    }));
    await queryRunner.createIndex(TABLE_NAME, new TableIndex({
      name: 'orders_by_pickupEvent_index',
      columnNames: ['pickupEvent'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(TABLE_NAME, new TableForeignKey({
      columnNames: ['pickupEvent'],
      referencedTableName: 'OrderPickupEvents',
      referencedColumnNames: ['uuid'],
    }));
    await queryRunner.dropIndex(TABLE_NAME, 'orders_by_pickupEvent_index');
    await queryRunner.dropColumn(TABLE_NAME, 'pickupEvent');
  }
}
