import { MigrationInterface, QueryRunner } from 'typeorm';

const enumType = 'enum_Users_accessType';
const enumValue = 'STAFF';

export class AddStaffRole1595474540818 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "${enumType}" ADD VALUE '${enumValue}' BEFORE 'ADMIN'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pg_enum WHERE enumlabel='${enumValue}' AND `
    + `enumtypid =(SELECT oid FROM pg_type WHERE typname = '${enumType}')`);
  }
}
