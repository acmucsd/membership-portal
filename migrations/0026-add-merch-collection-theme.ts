import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMerchCollectionTheme1621463276136 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('MerchandiseCollections', new TableColumn({
      name: 'themeColor',
      type: 'varchar(255)',
      isNullable: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('MerchandiseCollections', 'themeColor');
  }
}
