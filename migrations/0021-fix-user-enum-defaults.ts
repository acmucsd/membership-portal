import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUserEnumDefaults1603649172865 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN "state" SET DEFAULT \'PENDING\'');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN "accessType" SET DEFAULT \'STANDARD\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // this is empty because it's fixing an issue from the last migration
  }
}
