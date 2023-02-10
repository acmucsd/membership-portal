import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const TABLE_NAME = 'UserSocialMedia';

export class UserSocialMedia1676064415533 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: TABLE_NAME,
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
          name: 'type',
          type: 'varchar(255)',
        },
        {
          name: 'url',
          type: 'varchar(255)',
        },
      ],
      indices: [
        {
          name: 'social_media_by_user_index',
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
    await queryRunner.dropTable(TABLE_NAME);
  }
}
