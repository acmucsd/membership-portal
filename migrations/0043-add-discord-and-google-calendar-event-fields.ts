import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_NAME = 'Events';

export class AddDiscordAndGoogleCalendarEventFields1711750534274 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(TABLE_NAME, [
      new TableColumn({
        name: 'discordEvent',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'googleCalendarEvent',
        type: 'uuid',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns(TABLE_NAME, [
      new TableColumn({
        name: 'discordEvent',
        type: 'uuid',
      }),
      new TableColumn({
        name: 'googleCalendarEvent',
        type: 'uuid',
      }),
    ]);
  }
}
