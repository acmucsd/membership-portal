import {MigrationInterface, QueryRunner, TableColumn} from "typeorm";

const TABLE_NAME = 'Users';

export class addOnboardingTask1727933494169 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns(TABLE_NAME, [
            new TableColumn({
              name: 'onboardingComplete',
              type: 'boolean',
              default: false,
              isNullable: false,
            }),
            new TableColumn({
              name: 'resumeUpload',
              type: 'boolean',
              default: false,
              isNullable: false,
            }),
            new TableColumn({
              name: 'profilePicture',
              type: 'boolean',
              default: false,
              isNullable: false,
            }),
            new TableColumn({
              name: 'addedBio',
              type: 'boolean',
              default: false,
              isNullable: false,
            }),
            new TableColumn({
              name: 'eventsAttended',
              type: 'int',
              default: 0,
              isNullable: false,
            }),
          ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumns(TABLE_NAME, [
            new TableColumn({
              name: 'onboardingComplete',
              type: 'boolean',
            }),
            new TableColumn({
              name: 'resumeUpload',
              type: 'boolean',
            }),
            new TableColumn({
              name: 'profilePicture',
              type: 'boolean',
            }),
            new TableColumn({
              name: 'addedBio',
              type: 'boolean',
            }),
            new TableColumn({
              name: 'eventsAttended',
              type: 'int',
            }),
          ]);
    }

}
