import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'OrderItems';

export class AddOrderItemsTable1598590991046 implements MigrationInterface {
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
          name: 'order',
          type: 'uuid',
        },
        {
          name: 'item',
          type: 'uuid',
        },
        {
          name: 'salePriceAtPurchase',
          type: 'integer',
        },
        {
          name: 'discountPercentageAtPurchase',
          type: 'integer',
        },
        {
          name: 'fulfilled',
          type: 'boolean',
          default: false,
        },
        {
          name: 'fulfilledAt',
          type: 'timestamptz',
          default: 'CURRENT_TIMESTAMP(6)',
          isNullable: true,
        },
        {
          name: 'notes',
          type: 'text',
          isNullable: true,
        },
      ],
    }));
    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'order_items_uuid',
        columnNames: ['uuid'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'items_per_order_index',
        columnNames: ['order'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
