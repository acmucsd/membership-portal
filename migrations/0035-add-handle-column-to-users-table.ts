import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddHandleColumnToUsersTable1667512340166 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add "handle" column to "Users" table as nullable initially since it does not contain any data
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

    // Populate the "handle" column of "Users" table in every row with a default value
    // formatted as {firstName}-{lastName}-{hash} truncated to 32 characters
    await queryRunner.query(`
      UPDATE "${TABLE_NAME}"
      SET handle = substr("firstName" || '-' || "lastName", 0, 26) || '-' || substr(md5(random()::text), 0, 7)
    `);

    // Restrict "handle" column to be non-nullable now that all rows contain a valid unique handle string
    await queryRunner.query(`ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "handle" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, 'users_by_handle_index');
    await queryRunner.dropColumn(TABLE_NAME, 'handle');
  }
}
