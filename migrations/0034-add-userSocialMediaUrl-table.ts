import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddUserSocialMediaUrlsTable1663760514239 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'UserSocialMediaUrls',
      columns: [
        {
          name: 'uuid',
          type: 'uuid',
          isPrimary: true,
          isGenerated: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'user',
          type: 'uuid',
        },
        {
          name: 'socialMediaType',
          type: 'varchar(255)',
        },
        {
          name: 'url',
          type: 'varchar(255)',
        },
      ],
      indices: [
        {
          name: 'social_media_url_by_user_index',
          columnNames: ['user'],
        },
      ],
      foreignKeys: [
        {
          columnNames: ['user'],
          referencedTableName: 'Users',
          referencedColumnNames: ['uuid'],
          onDelete: 'CASCADE',
        },
      ],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('UserSocialMediaUrls');
  }
}
