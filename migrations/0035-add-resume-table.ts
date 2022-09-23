import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'Resumes';

export class AddResumeTable1663900724564 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: TABLE_NAME,
      columns: [
        {
          name: 'uuid',
          type: 'uuid',
          isGenerated: true,
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'user',
          type: 'uuid',
        },
        {
          name: 'isResumeVisible',
          type: 'boolean',
          default: false,
        },
        {
          name: 'url',
          type: 'varchar(255)',
        },
        {
          name: 'lastUpdated',
          type: 'timestamptz',
          default: 'CURRENT_TIMESTAMP(6)',
        },
      ],
    }));

    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'resumes_by_user_index',
        columnNames: ['user'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
