import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'OrderPickupEvents';
const COLUMN_NAME = 'orderDeadline';

export class AddOrderPickupEventDeadline1794960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME,
      new TableColumn({
        name: COLUMN_NAME,
        type: 'timestamptz',
        isNullable: true,
      }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME, COLUMN_NAME);
  }
}
