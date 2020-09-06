import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'Events';

export class AddEventsTable1595474505142 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: TABLE_NAME,
      columns: [
        {
          name: 'id',
          type: 'integer',
          isGenerated: true,
          isPrimary: true,
        },
        {
          name: 'uuid',
          type: 'uuid',
          isGenerated: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'organization',
          type: 'varchar(255)',
          default: '\'ACM\'',
        },
        {
          name: 'committee',
          type: 'varchar(255)',
          default: '\'ACM\'',
        },
        {
          name: 'thumbnail',
          type: 'varchar(255)',
          isNullable: true,
        },
        {
          name: 'cover',
          type: 'varchar(255)',
          isNullable: true,
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
          name: 'location',
          type: 'varchar(255)',
          isNullable: true,
        },
        {
          name: 'eventLink',
          type: 'varchar(255)',
          isNullable: true,
        },
        {
          name: 'start',
          type: 'timestamptz',
        },
        {
          name: 'end',
          type: 'timestamptz',
        },
        {
          name: 'attendanceCode',
          type: 'varchar(255)',
          isUnique: true,
        },
        {
          name: 'pointValue',
          type: 'integer',
        },
        {
          name: 'deleted',
          type: 'boolean',
          default: false,
        },
      ],
    }));
    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'events_uuid',
        columnNames: ['uuid'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'event_start_end_index',
        columnNames: ['start', 'end'],
      }),
      new TableIndex({
        name: 'events_committee',
        columnNames: ['committee'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
