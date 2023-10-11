import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'MerchCollectionPhotos';

export class addCollectionImageTable1696990832868 implements MigrationInterface {

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
              name: 'merchCollection',
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
        }));

        await queryRunner.createIndices(TABLE_NAME, [
          new TableIndex({
            name: 'images_by_collection_index',
            columnNames: ['merchCollection'],
          }),
        ]);
      }

      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable(TABLE_NAME);
      }

}
