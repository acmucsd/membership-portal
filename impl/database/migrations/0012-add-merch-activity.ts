import { MigrationInterface, QueryRunner } from 'typeorm';

const enumName = 'enum_Activities_type';
const enumValue = 'ORDER_MERCHANDISE';

export class AddMerchActivity1598589697701 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "${enumName}" ADD VALUE '${enumValue}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pg_enum WHERE enumlabel='${enumValue}' AND `
    + `enumtypid =(SELECT oid FROM pg_type WHERE typname = '${enumName}')`);
  }
}
