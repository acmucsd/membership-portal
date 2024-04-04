import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE_NAME = 'Events';
const CONSTRAINT_NAME = 'Events_attendanceCode_key';

export class RemoveUniqueAttendanceCodeConstraint1712188218208 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "${TABLE_NAME}" DROP CONSTRAINT "${CONSTRAINT_NAME}"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "${TABLE_NAME}" ADD UNIQUE ("attendanceCode")`);
  }
}
