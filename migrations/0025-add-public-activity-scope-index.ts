import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddActivityScopeIndex1608574428247 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex('Activities',
      new TableIndex({
        name: 'public_activities_by_user_index',
        columnNames: ['scope'],
        where: 'scope = \'PUBLIC\'',
      }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('Activities', 'public_activities_by_user_index');
  }
}
