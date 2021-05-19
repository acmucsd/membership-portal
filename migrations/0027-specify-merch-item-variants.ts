import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class SpecifyMerchItemVariants1621463589936 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('MerchandiseItems', new TableColumn({
      name: 'hasVariants',
      type: 'boolean',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('MerchandiseItems', 'hasVariants');
  }
}
