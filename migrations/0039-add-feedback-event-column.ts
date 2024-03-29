import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

const TABLE_NAME = 'Feedback';
const OLD_NAME = 'title';
const NEW_NAME = 'source';

export class AddFeedbackEventColumn1709112961573 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "${TABLE_NAME}" RENAME COLUMN "${OLD_NAME}" TO "${NEW_NAME}"`);
    await queryRunner.query(`ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "${NEW_NAME}" TYPE text`);

    await queryRunner.addColumn(
      TABLE_NAME,
      new TableColumn({
        name: 'event',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: 'feedback_by_event_index',
        columnNames: ['event'],
      }),
    );

    await queryRunner.createForeignKey(
      TABLE_NAME,
      new TableForeignKey({
        columnNames: ['event'],
        referencedTableName: 'Events',
        referencedColumnNames: ['uuid'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(TABLE_NAME, new TableForeignKey({
      columnNames: ['event'],
      referencedTableName: 'Events',
      referencedColumnNames: ['uuid'],
      onDelete: 'CASCADE',
    }));

    await queryRunner.dropIndex(TABLE_NAME, 'feedback_by_event_index');
    await queryRunner.dropColumn(TABLE_NAME, 'event');

    await queryRunner.query(`ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "${NEW_NAME}" TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE "${TABLE_NAME}" RENAME COLUMN "${NEW_NAME}" TO "${OLD_NAME}"`);
  }
}
