import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'Activities';

export class AddActivitiesTable1595474518615 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: TABLE_NAME,
      columns: [
        {
          name: 'id',
          type: 'integer',
          isGenerated: true,
          isPrimary: true,
        },
        {
          name: 'uuid',
          type: 'uuid',
          isGenerated: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'user',
          type: 'uuid',
        },
        {
          name: 'type',
          type: 'enum',
          enumName: 'enum_Activities_type',
          enum: [
            'ACCOUNT_CREATE',
            'ACCOUNT_ACTIVATE',
            'ACCOUNT_RESET_PASS',
            'ACCOUNT_RESET_PASS_REQUEST',
            'ACCOUNT_UPDATE_INFO',
            'ACCOUNT_LOGIN',
            'ATTEND_EVENT',
            'MILESTONE',
          ],
        },
        {
          name: 'description',
          type: 'varchar(255)',
          isNullable: true,
        },
        {
          name: 'pointsEarned',
          type: 'integer',
          default: 0,
        },
        {
          name: 'timestamp',
          type: 'timestamptz',
          default: 'CURRENT_TIMESTAMP(6)',
        },
        {
          name: 'public',
          type: 'boolean',
          default: false,
        },
      ],
    }));
    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'activities_uuid',
        columnNames: ['uuid'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'public_activities_by_user_index',
        columnNames: ['user'],
        where: 'public = true',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
