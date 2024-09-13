import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Events';

export class AddEventDrafting1716419261341 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            TABLE_NAME,
            new TableColumn({
                name: 'published',
                type: 'boolean',
                default: true, // default to true for backward compadibility
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(TABLE_NAME, 'published');
    }

}
