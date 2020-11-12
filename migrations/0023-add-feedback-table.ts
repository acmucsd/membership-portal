import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class SubmitFeedbackTable1603825929793 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'Feedback',
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
        },
        {
          name: 'timestamp',
          type: 'timestamptz',
          default: 'CURRENT_TIMESTAMP(6)',
        },
        {
          name: 'status',
          type: 'varchar(255)',
          default: '\'SUBMITTED\'',
        },
        {
          name: 'type',
          type: 'varchar',
        },
      ],
      indices: [
        {
          name: 'feedback_by_user_index',
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
    await queryRunner.dropTable('Feedback');
  }
}
