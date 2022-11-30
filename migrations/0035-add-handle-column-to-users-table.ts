import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddHandleColumnToUsersTable1667512340166 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'handle',
      type: 'varchar(255)',
      isNullable: true,
      isUnique: true,
    }));

    await queryRunner.createIndex(TABLE_NAME, new TableIndex({
      name: 'users_by_handle_index',
      columnNames: ['handle'],
      isUnique: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, 'users_by_handle_index');
    await queryRunner.dropColumn(TABLE_NAME, 'handle');
  }
}
