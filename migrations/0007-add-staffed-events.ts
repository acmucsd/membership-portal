import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Events';

export class AddStaffedEvents1595474545484 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(TABLE_NAME, [
      new TableColumn({
        name: 'requiresStaff',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'staffPointBonus',
        type: 'integer',
        default: 0,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME, 'requiresStaff');
    await queryRunner.dropColumn(TABLE_NAME, 'staffPointBonus');
  }
}
