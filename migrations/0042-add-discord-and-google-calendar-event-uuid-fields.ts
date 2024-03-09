import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Events';

export class AddDiscordAndGoogleCalendarEventUuidFields1710016392452 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(TABLE_NAME, [
      new TableColumn({
        name: 'discordEventUuid',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'googleCalendarEventUuid',
        type: 'uuid',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns(TABLE_NAME, [
      new TableColumn({
        name: 'discordEventUuid',
        type: 'uuid',
      }),
      new TableColumn({
        name: 'googleCalendarEventUuid',
        type: 'uuid',
      }),
    ]);
  }
}
