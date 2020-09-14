import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MergeOldSchema1598743920351 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /* Change primary keys of all tables from id to uuid */
    /* Need to manually drop old ones since pkey names are different */
    await queryRunner.query('ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "Users_pkey"');
    await queryRunner.query('ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "PK_16d4f7d636df336db11d87413e3"');
    await queryRunner.query('ALTER TABLE "Events" DROP CONSTRAINT IF EXISTS "Events_pkey"');
    await queryRunner.query('ALTER TABLE "Events" DROP CONSTRAINT IF EXISTS "PK_efc6f7ffffa26a4d4fe5f383a0b"');
    await queryRunner.query('ALTER TABLE "Attendances" DROP CONSTRAINT IF EXISTS "Attendances_pkey"');
    await queryRunner.query('ALTER TABLE "Attendances" DROP CONSTRAINT IF EXISTS "PK_95d2bbe195bb697b84bae415391"');
    await queryRunner.query('ALTER TABLE "Activities" DROP CONSTRAINT IF EXISTS "Activities_pkey"');
    await queryRunner.query('ALTER TABLE "Activities" DROP CONSTRAINT IF EXISTS "PK_68241637da2837e6d5a4db6f806"');
    await queryRunner
      .query('ALTER TABLE "MerchandiseCollections" DROP CONSTRAINT IF EXISTS "MerchandiseCollections_pkey"');
    await queryRunner
      .query('ALTER TABLE "MerchandiseCollections" DROP CONSTRAINT IF EXISTS "PK_52b6ede422f478c511ae2c73cd0"');
    await queryRunner.query('ALTER TABLE "Merchandise" DROP CONSTRAINT IF EXISTS "Merchandise_pkey"');
    await queryRunner.query('ALTER TABLE "Merchandise" DROP CONSTRAINT IF EXISTS "PK_019351f9003428631a70caa0b81"');
    await queryRunner.query('ALTER TABLE "Orders" DROP CONSTRAINT IF EXISTS "Orders_pkey"');
    await queryRunner.query('ALTER TABLE "Orders" DROP CONSTRAINT IF EXISTS "PK_ce8e3c4d56e47ff9c8189c26213"');
    await queryRunner.query('ALTER TABLE "OrderItems" DROP CONSTRAINT IF EXISTS "OrderItems_pkey"');
    await queryRunner.query('ALTER TABLE "OrderItems" DROP CONSTRAINT IF EXISTS "PK_567f75d7ff079b9ab3e6dd33708"');
    /* Now, create them via API */
    await queryRunner.createPrimaryKey('Users', ['uuid']);
    await queryRunner.createPrimaryKey('Events', ['uuid']);
    await queryRunner.createPrimaryKey('Attendances', ['uuid']);
    await queryRunner.createPrimaryKey('Activities', ['uuid']);
    await queryRunner.createPrimaryKey('MerchandiseCollections', ['uuid']);
    await queryRunner.createPrimaryKey('Merchandise', ['uuid']);
    await queryRunner.createPrimaryKey('Orders', ['uuid']);
    await queryRunner.createPrimaryKey('OrderItems', ['uuid']);

    /* Match unique index names so TypeORM can properly use them */
    await queryRunner.query('ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "Users_email_key"');
    await queryRunner.query('ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "UQ_3c3ab3f49a87e6ddb607f3c4945"');
    await queryRunner.query('ALTER TABLE "Users" ADD CONSTRAINT "UQ_3c3ab3f49a87e6ddb607f3c4945" UNIQUE (email)');

    await queryRunner.query('ALTER TABLE "Events" DROP CONSTRAINT IF EXISTS "Events_attendanceCode_key"');
    await queryRunner.query('ALTER TABLE "Events" DROP CONSTRAINT IF EXISTS "UQ_36def2ba671e2b24dbcb5ca3a09"');
    await queryRunner
      .query('ALTER TABLE "Events" ADD CONSTRAINT "UQ_36def2ba671e2b24dbcb5ca3a09" UNIQUE ("attendanceCode")');

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
    await queryRunner.query('ALTER TABLE "Activities" ADD CONSTRAINT "FK_9a937195f1c04b94f53f4fb00d3" '
                + 'FOREIGN KEY ("user") REFERENCES "Users"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "Attendances" ADD CONSTRAINT "FK_6d240e175789376a0324491f1ac" '
                + 'FOREIGN KEY ("user") REFERENCES "Users"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "Attendances" ADD CONSTRAINT "FK_1bfe2a60f758bb2f7c3ddff35d0"'
                + 'FOREIGN KEY ("event") REFERENCES "Events"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "Merchandise" ADD CONSTRAINT "FK_366fa6b0e1ed10fc8d43bd08b0d"'
                + 'FOREIGN KEY ("collection") REFERENCES "MerchandiseCollections"("uuid") ON DELETE CASCADE '
                + 'ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "OrderItems" ADD CONSTRAINT "FK_ef589ebbdb5eebec30a52ea9c95"'
                + 'FOREIGN KEY ("order") REFERENCES "Orders"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "OrderItems" ADD CONSTRAINT "FK_9f816e831abbf7e97fa16df1425"'
                + 'FOREIGN KEY ("item") REFERENCES "Merchandise"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "Orders" ADD CONSTRAINT "FK_11c5a02e75c453582d4b17ac57b"'
                + 'FOREIGN KEY ("user") REFERENCES "Users"("uuid") ON DELETE NO ACTION ON UPDATE NO ACTION');
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
    await queryRunner.query('ALTER TABLE "Activities" DROP CONSTRAINT "FK_9a937195f1c04b94f53f4fb00d3"');
    await queryRunner.query('ALTER TABLE "Attendances" DROP CONSTRAINT "FK_6d240e175789376a0324491f1ac"');
    await queryRunner.query('ALTER TABLE "Attendances" DROP CONSTRAINT "FK_1bfe2a60f758bb2f7c3ddff35d0"');
    await queryRunner.query('ALTER TABLE "Merchandise" DROP CONSTRAINT "FK_366fa6b0e1ed10fc8d43bd08b0d"');
    await queryRunner.query('ALTER TABLE "OrderItems" DROP CONSTRAINT "FK_ef589ebbdb5eebec30a52ea9c95"');
    await queryRunner.query('ALTER TABLE "OrderItems" DROP CONSTRAINT "FK_9f816e831abbf7e97fa16df1425"');
    await queryRunner.query('ALTER TABLE "Orders" DROP CONSTRAINT "FK_11c5a02e75c453582d4b17ac57b"');
  }
}
