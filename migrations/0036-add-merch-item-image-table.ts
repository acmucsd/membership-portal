import {MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

const TABLE_NAME = 'MerchItemImages';

export class addMerchItemImageTable1681777109787 implements MigrationInterface {

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
          name: 'merchItem',
          type: 'uuid',
        },
        {
          name: 'picture',
          type: 'varchar(255)',
        },
      ],
    }));

    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'images_by_item_index',
        columnNames: ['merchItem'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // create old column
    // fill old column with the first image from each table
  }

}
