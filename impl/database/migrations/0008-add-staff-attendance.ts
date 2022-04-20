import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Attendances';

export class AddStaffAttendance1595474552159 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME,
      new TableColumn({
        name: 'asStaff',
        type: 'boolean',
        default: false,
      }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME, 'asStaff');
  }
}
