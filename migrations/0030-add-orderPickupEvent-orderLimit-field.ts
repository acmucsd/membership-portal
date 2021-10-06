import {MigrationInterface, QueryRunner, TableColumn} from "typeorm";

const TABLE_NAME = "OrderPickupEvents";

export class addOrderPickupEventOrderLimitField1633494827092 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(TABLE_NAME, new TableColumn({
            name: 'orderLimit',
            type: 'integer',
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(TABLE_NAME, 'orderLimit');
    }

}
