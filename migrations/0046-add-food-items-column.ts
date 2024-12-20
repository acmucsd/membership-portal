import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Events';

export class AddFoodItemsColumn1728959627663 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME,
      new TableColumn({
        name: 'foodItems',
        type: 'varchar(255)',
        isNullable: true,
      }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME,
      new TableColumn({
        name: 'foodItems',
        type: 'varchar(255)',
      }));
  }
}
