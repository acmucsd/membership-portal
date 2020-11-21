import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class SubmitEventFeedback1603825909623 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('Attendances', new TableColumn({
      name: 'feedback',
      type: 'text',
      isNullable: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('Attendances', 'feedback');
  }
}
