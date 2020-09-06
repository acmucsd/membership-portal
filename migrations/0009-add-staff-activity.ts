import { MigrationInterface, QueryRunner } from 'typeorm';

const enumName = 'enum_Activities_type';
const enumValue = 'ATTEND_EVENT_AS_STAFF';

export class AddStaffActivity1595474561776 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "${enumName}" ADD VALUE '${enumValue}' AFTER 'ATTEND_EVENT'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pg_enum WHERE enumlabel='${enumValue}' AND `
    + `enumtypid =(SELECT oid FROM pg_type WHERE typname = '${enumName}')`);
  }
}
