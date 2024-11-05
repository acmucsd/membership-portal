import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddOnboardingSeen1730353019494 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME,
      new TableColumn({
        name: 'onboardingSeen',
        type: 'boolean',
        isNullable: true,
        default: false,
      }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME,
      new TableColumn({
        name: 'onboardingSeen',
        type: 'boolean',
        isNullable: true,
        default: false,
      }));
  }
}
