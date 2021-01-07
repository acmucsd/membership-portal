import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddActivityScopeIndex1608574428247 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex('Activities',
      new TableIndex({
        name: 'visible_activities_by_user_index',
        columnNames: ['user'],
        where: 'scope = \'PUBLIC\' OR scope = \'PRIVATE\'',
      }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('Activities', 'visible_activities_by_user_index');
  }
}
