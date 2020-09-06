import { MigrationInterface, QueryRunner } from 'typeorm';

const enumName = 'enum_Activities_type';
const enumValue = 'BONUS_POINTS';

export class AddBonusPoints1595474528982 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "${enumName}" ADD VALUE '${enumValue}' BEFORE 'MILESTONE'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pg_enum WHERE enumlabel='${enumValue}' AND `
    + `enumtypid =(SELECT oid FROM pg_type WHERE typname = '${enumName}')`);
  }
}
