import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

const TABLE_NAME = 'CollectionPhotos';
const MERCH_TABLE_NAME = 'CollectionItems';

export class addCollectionImageTable implements MigrationInterface {

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
            name: 'collection',
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

      await queryRunner.createIndices(TABLE_NAME, [
        new TableIndex({
          name: 'images_by_collection_index',
          columnNames: ['collection'],
        }),
      ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.dropTable(TABLE_NAME);
    }

}
