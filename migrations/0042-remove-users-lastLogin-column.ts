import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Users';

export class RemoveUsersLastLoginColumn1711518997063 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_NAME, 'lastLogin');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_NAME, new TableColumn({
      name: 'lastLogin',
      type: 'timestamptz',
      default: 'CURRENT_TIMESTAMP(6)',
    }));
  }
}
