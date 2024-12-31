import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class MergeOldSchema1598743920351 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /* Change primary keys of all tables from id to uuid */
    await queryRunner.dropPrimaryKey('Users');
    await queryRunner.dropPrimaryKey('Events');
    await queryRunner.dropPrimaryKey('Attendances');
    await queryRunner.dropPrimaryKey('Activities');
    await queryRunner.dropPrimaryKey('MerchandiseCollections');
    await queryRunner.dropPrimaryKey('Merchandise');
    await queryRunner.dropPrimaryKey('Orders');
    await queryRunner.dropPrimaryKey('OrderItems');

    /* Now, create them via API */
    await queryRunner.createPrimaryKey('Users', ['uuid']);
    await queryRunner.createPrimaryKey('Events', ['uuid']);
    await queryRunner.createPrimaryKey('Attendances', ['uuid']);
    await queryRunner.createPrimaryKey('Activities', ['uuid']);
    await queryRunner.createPrimaryKey('MerchandiseCollections', ['uuid']);
    await queryRunner.createPrimaryKey('Merchandise', ['uuid']);
    await queryRunner.createPrimaryKey('Orders', ['uuid']);
    await queryRunner.createPrimaryKey('OrderItems', ['uuid']);

    /* Make all columns with default values NOT NULL */
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN uuid SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN "accessType" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN state SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN points SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN "lastLogin" SET NOT NULL');

    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN uuid SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN organization SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN committee SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN location SET NOT NULL');

    await queryRunner.query('ALTER TABLE "Attendances" ALTER COLUMN uuid SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Attendances" ALTER COLUMN timestamp SET NOT NULL');

    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN uuid SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN "pointsEarned" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN timestamp SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN public SET DEFAULT false');

    /* Change all null publics to false before setting null constraint */
    await queryRunner.query('UPDATE "Activities" SET public = false WHERE public IS NULL');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN public SET NOT NULL');

    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ALTER COLUMN uuid SET NOT NULL');
    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ALTER COLUMN description SET NOT NULL');
    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ALTER COLUMN archived SET NOT NULL');

    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN uuid SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN quantity SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN "discountPercentage" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN "numSold" SET NOT NULL');

    await queryRunner.query('ALTER TABLE "Orders" ALTER COLUMN uuid SET NOT NULL');

    await queryRunner.query('ALTER TABLE "OrderItems" ALTER COLUMN uuid SET NOT NULL');
    await queryRunner.query('ALTER TABLE "OrderItems" ALTER COLUMN fulfilled SET NOT NULL');

    /* Add defaults for NOT NULL columns */
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN "lastLogin" SET DEFAULT CURRENT_TIMESTAMP(6)');

    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()');

    await queryRunner.query('ALTER TABLE "Attendances" ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()');
    await queryRunner.query('ALTER TABLE "Attendances" ALTER COLUMN timestamp SET DEFAULT CURRENT_TIMESTAMP(6)');

    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN timestamp SET DEFAULT CURRENT_TIMESTAMP(6)');

    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()');
    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()');

    await queryRunner.query('ALTER TABLE "Orders" ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()');
    await queryRunner.query('ALTER TABLE "Orders" ALTER COLUMN "orderedAt" SET DEFAULT CURRENT_TIMESTAMP(6)');
    await queryRunner.query('ALTER TABLE "OrderItems" ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()');
    await queryRunner.query('ALTER TABLE "OrderItems" ALTER COLUMN "fulfilledAt" SET DEFAULT CURRENT_TIMESTAMP(6)');

    /* Re-order rewrite's indexes to match old schema's index ordering */
    await queryRunner.query('DROP INDEX leaderboard_index');
    await queryRunner.query('CREATE INDEX leaderboard_index ON "Users" USING btree (points DESC NULLS FIRST)');

    await queryRunner.query('DROP INDEX recent_orders_index');
    await queryRunner.query('CREATE INDEX recent_orders_index ON "Orders" USING btree ("orderedAt" DESC NULLS FIRST)');

    /* Add foreign keys */
    await queryRunner.createForeignKey('Activities', new TableForeignKey({
      columnNames: ['user'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Users',
    }));
    await queryRunner.createForeignKey('Attendances', new TableForeignKey({
      columnNames: ['user'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Users',
    }));
    await queryRunner.createForeignKey('Attendances', new TableForeignKey({
      columnNames: ['event'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Events',
    }));
    await queryRunner.createForeignKey('Merchandise', new TableForeignKey({
      columnNames: ['collection'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'MerchandiseCollections',
      onDelete: 'CASCADE',
    }));
    await queryRunner.createForeignKey('Orders', new TableForeignKey({
      columnNames: ['user'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Users',
    }));
    await queryRunner.createForeignKey('OrderItems', new TableForeignKey({
      columnNames: ['order'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Orders',
    }));
    await queryRunner.createForeignKey('OrderItems', new TableForeignKey({
      columnNames: ['item'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Merchandise',
      name: 'OrderItems_item_Merchandise_uuid_fkey',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /* Re-change primary keys of all tables from uuid to id */
    await queryRunner.updatePrimaryKeys('Users', [
      new TableColumn({
        name: 'id',
        type: 'integer',
      }),
    ]);
    await queryRunner.updatePrimaryKeys('Events', [
      new TableColumn({
        name: 'id',
        type: 'integer',
      }),
    ]);
    await queryRunner.updatePrimaryKeys('Attendances', [
      new TableColumn({
        name: 'id',
        type: 'integer',
      }),
    ]);
    await queryRunner.updatePrimaryKeys('Activities', [
      new TableColumn({
        name: 'id',
        type: 'integer',
      }),
    ]);
    await queryRunner.updatePrimaryKeys('MerchandiseCollections', [
      new TableColumn({
        name: 'id',
        type: 'integer',
      }),
    ]);
    await queryRunner.updatePrimaryKeys('Merchandise', [
      new TableColumn({
        name: 'id',
        type: 'integer',
      }),
    ]);
    await queryRunner.updatePrimaryKeys('Orders', [
      new TableColumn({
        name: 'id',
        type: 'integer',
      }),
    ]);
    await queryRunner.updatePrimaryKeys('OrderItems', [
      new TableColumn({
        name: 'id',
        type: 'integer',
      }),
    ]);

    /* Make all changed NOT NULL columns to NULLABLE */
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN uuid DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN "accessType" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN state DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN points DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN "lastLogin" DROP NOT NULL');

    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN uuid DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN organization DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN committee DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN location DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN "eventLink" DROP NOT NULL');

    await queryRunner.query('ALTER TABLE "Attendances" ALTER COLUMN uuid DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Attendances" ALTER COLUMN timestamp DROP NOT NULL');

    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN uuid DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN "pointsEarned" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN timestamp DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN public DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN public DROP NOT NULL');

    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ALTER COLUMN uuid DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ALTER COLUMN description DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ALTER COLUMN archived DROP NOT NULL');

    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN uuid DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN quantity DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN "discountPercentage" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN "numSold" DROP NOT NULL');

    await queryRunner.query('ALTER TABLE "Orders" ALTER COLUMN uuid DROP NOT NULL');

    await queryRunner.query('ALTER TABLE "OrderItems" ALTER COLUMN uuid DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "OrderItems" ALTER COLUMN fulfilled DROP NOT NULL');

    /* Remove defaults for NOT NULL columns */
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN uuid DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "Users" ALTER COLUMN "lastLogin" DROP DEFAULT');

    await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN uuid DROP DEFAULT');

    await queryRunner.query('ALTER TABLE "Attendances" ALTER COLUMN uuid DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "Attendances" ALTER COLUMN timestamp DROP DEFAULT');

    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN uuid DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "Activities" ALTER COLUMN timestamp DROP DEFAULT');

    await queryRunner.query('ALTER TABLE "MerchandiseCollections" ALTER COLUMN uuid DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "Merchandise" ALTER COLUMN uuid DROP DEFAULT');

    await queryRunner.query('ALTER TABLE "Orders" ALTER COLUMN uuid DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "Orders" ALTER COLUMN "orderedAt" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "OrderItems" ALTER COLUMN uuid DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "OrderItems" ALTER COLUMN "fulfilledAt" DROP DEFAULT');

    /* Drop foreign keys */
    await queryRunner.dropForeignKey('Activities', new TableForeignKey({
      columnNames: ['user'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Users',
    }));
    await queryRunner.dropForeignKey('Attendances', new TableForeignKey({
      columnNames: ['user'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Users',
    }));
    await queryRunner.dropForeignKey('Attendances', new TableForeignKey({
      columnNames: ['event'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Events',
    }));
    await queryRunner.dropForeignKey('Merchandise', new TableForeignKey({
      columnNames: ['collection'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'MerchandiseCollections',
    }));
    await queryRunner.dropForeignKey('Orders', new TableForeignKey({
      columnNames: ['user'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Users',
    }));
    await queryRunner.dropForeignKey('OrderItems', new TableForeignKey({
      columnNames: ['order'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Orders',
    }));
    await queryRunner.dropForeignKey('OrderItems', new TableForeignKey({
      columnNames: ['item'],
      referencedColumnNames: ['uuid'],
      referencedTableName: 'Merchandise',
    }));
  }
}
