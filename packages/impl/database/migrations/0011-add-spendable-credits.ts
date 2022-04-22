import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddSpendableCredits1598589020508 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'credits',
      type: 'integer',
      default: 0,
    }));
    await queryRunner.query('UPDATE "Users" SET credits = points * 100');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME, 'credits');
  }
}
