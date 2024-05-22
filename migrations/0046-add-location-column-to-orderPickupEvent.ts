import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'OrderPickupEvents';
const COLUMN_NAME = 'location';

export class AddLocationColumnToOrderPickupEvent1716061560746 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: COLUMN_NAME,
      type: 'varchar(255)',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME, COLUMN_NAME);
  }
}
