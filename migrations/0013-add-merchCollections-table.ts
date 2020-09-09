import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'MerchandiseCollections';

export class AddMerchCollectionsTable1598590154911 implements MigrationInterface {
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
          name: 'title',
          type: 'varchar(255)',
        },
        {
          name: 'description',
          type: 'text',
        },
        {
          name: 'archived',
          type: 'boolean',
          default: false,
        },
      ],
    }));
    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'merchandise_collections_uuid',
        columnNames: ['uuid'],
        isUnique: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
