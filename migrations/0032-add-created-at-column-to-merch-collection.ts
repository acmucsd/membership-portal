import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtColumnToMerchCollection1640851101278 implements MigrationInterface {
  name = 'AddCreatedAtColumnToMerchCollection1640851101278';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "MerchandiseCollections" DROP COLUMN "createdAt"');
  }
}
