import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddUserFeedbackTable1602394486221 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'UserFeedback',
      columns: [
        {
          name: 'id',
          type: 'integer',
          isGenerated: true,
        },
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
          name: 'title',
          type: 'varchar(255)',
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'timestamp',
          type: 'timestamptz',
          default: 'CURRENT_TIMESTAMP(6)',
        },
        {
          name: 'responseReceived',
          type: 'boolean',
          default: 'false',
        },
      ],
      indices: [
        {
          name: 'user_feedback_user_index',
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
    await queryRunner.dropTable('UserFeedback');
  }
}
