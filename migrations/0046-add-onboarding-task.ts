import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddOnboardingTask1727933494169 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      TABLE_NAME,
      new TableColumn({
        name: 'onboardingComplete',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(
      TABLE_NAME,
      new TableColumn({
        name: 'onboardingComplete',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }
}
