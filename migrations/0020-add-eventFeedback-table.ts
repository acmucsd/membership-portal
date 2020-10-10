import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddEventFeedbackTable1602120071159 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'EventFeedback',
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
          name: 'event',
          type: 'uuid',
        },
        {
          name: 'user',
          type: 'uuid',
        },
        {
          name: 'comment',
          type: 'varchar(255)',
        },
      ],
      indices: [
        new TableIndex({
          name: 'event_feedback_event_index',
          columnNames: ['event'],
        }),
        new TableIndex({
          name: 'event_feedback_user_index',
          columnNames: ['user'],
        }),
      ],
      foreignKeys: [
        {
          columnNames: ['event'],
          referencedTableName: 'Events',
          referencedColumnNames: ['uuid'],
          onDelete: 'CASCADE',
        },
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
    await queryRunner.dropTable('EventFeedback');
  }
}
