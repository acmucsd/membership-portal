import {MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from "typeorm";

const TABLE_NAME = 'MerchandiseItemPhotos';
const MERCH_TABLE_NAME = 'MerchandiseItems';

export class addMerchItemImageTable1681777109787 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // instantiates table with columns: uuid, merchItem, picture, uploadedAt, position
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
        {
          name: 'uploadedAt',
          type: 'timestamptz',
          default: 'CURRENT_TIMESTAMP(6)',
        },
        {
          name: 'position',
          type: 'integer',
        },
      ],
    }));

    // optimize searching
    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'images_by_item_index',
        columnNames: ['merchItem'],
      }),
    ]);

    // add images from each item of the merchandise table to the photo table
    await queryRunner.query(
      `INSERT INTO "${TABLE_NAME}" ("merchItem", picture, position) ` +
      `SELECT uuid, picture, 0 AS position FROM "${MERCH_TABLE_NAME}"`
    );

    // remove the column from the old table
    await queryRunner.dropColumn(`${MERCH_TABLE_NAME}`, 'picture');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // create old column (copied from migration #7)
    await queryRunner.addColumn(`${MERCH_TABLE_NAME}`, new TableColumn({
      name: 'picture',
      type: 'varchar(255)',
      isNullable: true,
    }));

    // fill old column with the first image from the photo table
    await queryRunner.query(
      `UPDATE "${MERCH_TABLE_NAME}" i ` +
      `SET i.picture=p.picture FROM (` +
        `SELECT "merchItem", picture FROM "${TABLE_NAME}" m WHERE "uploadedAt" = (` +
          `SELECT min("uploadedAt") FROM "${TABLE_NAME}" n WHERE p."merchItem" = m."merchItem" GROUP BY "merchItem"` +
        `)` +
      `) AS p ` +
      `WHERE i.uuid = p."merchItem"`
    );
  }

}