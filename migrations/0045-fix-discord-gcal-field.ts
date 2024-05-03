import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class FixDiscordGcalField1714770061929 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN "discordEvent" TYPE varchar');
        await queryRunner.query('ALTER TABLE "Events" ALTER COLUMN "googleCalendarEvent" TYPE varchar');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // nothing here because it's fixing an earlier migration (# 0044)
    }

}
