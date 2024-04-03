import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

const TABLE_NAME = 'MerchandiseItemPhotos';
const MERCH_TABLE_NAME = 'MerchandiseItems';

export class AddMerchItemImageTable1691286073347 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // instantiates table with columns: uuid, merchItem, uploadedPhoto, uploadedAt, position
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
          name: 'uploadedPhoto',
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
      // optimize searching
      indices: [
        {
          name: 'images_by_item_index',
          columnNames: ['merchItem'],
        },
      ],
      // cascade delete
      foreignKeys: [
        {
          columnNames: ['merchItem'],
          referencedTableName: MERCH_TABLE_NAME,
          referencedColumnNames: ['uuid'],
          onDelete: 'CASCADE',
        },
      ],
    }));

    // add images from each item of the merchandise table to the photo table
    await queryRunner.query(
      `INSERT INTO "${TABLE_NAME}" ("merchItem", "uploadedPhoto", position) `
      + `SELECT uuid, picture, 0 AS position FROM "${MERCH_TABLE_NAME}" `
      + 'WHERE picture IS NOT NULL',
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
      `UPDATE "${MERCH_TABLE_NAME}" m `
      + 'SET picture = ('
        + 'SELECT "uploadedPhoto" '
        + `FROM "${TABLE_NAME}" p `
        + 'WHERE p."merchItem" = m.uuid '
        + 'ORDER BY p."uploadedAt" '
        + 'LIMIT 1'
      + ')',
    );

    await queryRunner.dropTable(TABLE_NAME);
  }
}
