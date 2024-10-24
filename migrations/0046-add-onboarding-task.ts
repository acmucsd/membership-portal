import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddOnboardingTask1727933494169 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(TABLE_NAME, [
      new TableColumn({
        name: 'onboardingSeen',
        type: 'boolean',
        isNullable: true,
        default: false,
      }),
      new TableColumn({
        name: 'firstTasksCompleted',
        type: 'boolean',
        isNullable: true,
        default: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns(TABLE_NAME, [
      new TableColumn({
        name: 'onboardingSeen',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'firstTasksCompleted',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    ]);
  }
}
