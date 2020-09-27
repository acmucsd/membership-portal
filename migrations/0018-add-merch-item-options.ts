import { MigrationInterface, QueryRunner, TableColumn, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddItemOptionsTable1600648017504 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('Merchandise', 'numSold');
    await queryRunner.renameTable('Merchandise', 'MerchandiseItems');
    await queryRunner.createTable(new Table({
      name: 'MerchandiseItemOptions',
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
          name: 'item',
          type: 'uuid',
        },
        {
          name: 'quantity',
          type: 'integer',
          default: 0,
        },
        {
          name: 'price',
          type: 'integer',
        },
        {
          name: 'discountPercentage',
          type: 'integer',
          default: 0,
        },
        {
          name: 'metadata',
          type: 'text',
          isNullable: true,
        },
      ],
      indices: [
        new TableIndex({
          name: 'merch_item_options_index',
          columnNames: ['item'],
        }),
      ],
      foreignKeys: [
        {
          columnNames: ['item'],
          referencedTableName: 'MerchandiseItems',
          referencedColumnNames: ['uuid'],
          onDelete: 'CASCADE',
        },
      ],
    }));
    await queryRunner.dropForeignKey('OrderItems', 'OrderItems_item_Merchandise_uuid_fkey');
    await queryRunner.renameColumn('OrderItems', 'item', 'option');
    await queryRunner.createForeignKey('OrderItems', new TableForeignKey({
      columnNames: ['option'],
      referencedTableName: 'MerchandiseItemOptions',
      referencedColumnNames: ['uuid'],
    }));
    await queryRunner.dropColumns('MerchandiseItems', [
      new TableColumn({
        name: 'quantity',
        type: 'integer',
      }),
      new TableColumn({
        name: 'price',
        type: 'integer',
      }),
      new TableColumn({
        name: 'discountPercentage',
        type: 'integer',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameTable('MerchandiseItems', 'Merchandise');
    await queryRunner.addColumn('Merchandise', new TableColumn({ name: 'numSold', type: 'integer', default: 0 }));
    await queryRunner.dropForeignKey('OrderItems', 'OrderItems_option_MerchandiseItemOptions_uuid_fkey');
    await queryRunner.renameColumn('OrderItems', 'option', 'item');
    await queryRunner.createForeignKey('OrderItems', new TableForeignKey({
      columnNames: ['item'],
      referencedTableName: 'Merchandise',
      referencedColumnNames: ['uuid'],
    }));
    await queryRunner.dropTable('MerchandiseItemOptions');
    await queryRunner.addColumns('Merchandise', [
      new TableColumn({
        name: 'quantity',
        type: 'integer',
        default: 0,
      }),
      new TableColumn({
        name: 'price',
        type: 'integer',
        default: 0,
      }),
      new TableColumn({
        name: 'discountPercentage',
        type: 'integer',
        isNullable: true,
      }),
    ]);
  }
}
