import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddResumeVisibleToRecruiterTable1659580706753 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'resumeVisitbleToRecruiter',
      type: 'boolean',
      isNullable: false,
      default: false,
    }));
    // maybe flag-like data? int has 32-bits = 32 different visibility choice
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME, 'resumeVisitbleToRecruiter');
  }
}
