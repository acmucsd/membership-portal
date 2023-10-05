import {MigrationInterface, QueryRunner, TableColumn} from "typeorm";

const TABLE_NAME = "Events";

export class addSlidesLinkToEventsTable1696465672671 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(TABLE_NAME, new TableColumn({
          name: 'slides_link',
          type: 'text',
          isNullable: true,
        }));
      }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(TABLE_NAME, 'slides_link');
    }

}
