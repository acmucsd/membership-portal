import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'Merchandise';

export class AddMerchTable1598590965470 implements MigrationInterface {
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
          name: 'itemName',
          type: 'varchar(255)',
        },
        {
          name: 'collection',
          type: 'uuid',
        },
        {
          name: 'picture',
          type: 'varchar(255)',
        },
        {
          name: 'price',
          type: 'integer',
        },
        {
          name: 'quantity',
          type: 'integer',
          default: 0,
        },
        {
          name: 'description',
          type: 'text',
        },
        {
          name: 'discountPercentage',
          type: 'integer',
          default: 0,
        },
        {
          name: 'monthlyLimit',
          type: 'integer',
          isNullable: true,
        },
        {
          name: 'lifetimeLimit',
          type: 'integer',
          isNullable: true,
        },
        {
          name: 'numSold',
          type: 'integer',
          default: 0,
        },
        {
          name: 'hidden',
          type: 'boolean',
          default: true,
        },
        {
          name: 'metadata',
          type: 'text',
          isNullable: true,
        },
      ],
    }));
    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'merchandise_uuid',
        columnNames: ['uuid'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'merchandise_collections_index',
        columnNames: ['collection'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
