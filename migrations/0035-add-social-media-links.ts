import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddSocialMediaLinks1660118187298 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'linkedin',
      type: 'varchar(255)',
      isNullable: false,
      default: '',
    }));
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'instagram',
      type: 'varchar(255)',
      isNullable: false,
      default: '',
    }));
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'facebook',
      type: 'varchar(255)',
      isNullable: false,
      default: '',
    }));
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'portfolio',
      type: 'varchar(255)',
      isNullable: false,
      default: '',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME, 'linkedin');
    await queryRunner.dropColumn(TABLE_NAME, 'instagram');
    await queryRunner.dropColumn(TABLE_NAME, 'facebook');
    await queryRunner.dropColumn(TABLE_NAME, 'portfolio');
  }
}
