import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'Orders';

export class AddOrdersTable1598590986254 implements MigrationInterface {
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
          name: 'user',
          type: 'uuid',
        },
        {
          name: 'totalCost',
          type: 'integer',
        },
        {
          name: 'orderedAt',
          type: 'timestamptz',
          default: 'CURRENT_TIMESTAMP(6)',
        },
      ],
    }));
    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'orders_uuid',
        columnNames: ['uuid'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'orders_per_user_index',
        columnNames: ['user'],
      }),
      new TableIndex({
        name: 'recent_orders_index',
        columnNames: ['orderedAt'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
