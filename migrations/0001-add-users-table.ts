import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'Users';

export class AddUsersTable1595474487693 implements MigrationInterface {
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
          name: 'email',
          type: 'varchar(255)',
          isUnique: true,
        },
        {
          name: 'profilePicture',
          type: 'varchar(255)',
          isNullable: true,
        },
        {
          name: 'accessType',
          type: 'enum',
          enumName: 'enum_Users_accessType',
          enum: ['RESTRICTED', 'STANDARD', 'ADMIN'],
          default: '\'STANDARD\'',
        },
        {
          name: 'state',
          type: 'enum',
          enumName: 'enum_Users_state',
          enum: ['PENDING', 'ACTIVE', 'BLOCKED', 'PASSWORD_RESET'],
          default: '\'PENDING\'',
        },
        {
          name: 'accessCode',
          type: 'varchar(255)',
          isNullable: true,
        },
        {
          name: 'firstName',
          type: 'varchar(255)',
        },
        {
          name: 'lastName',
          type: 'varchar(255)',
        },
        {
          name: 'hash',
          type: 'varchar(255)',
        },
        {
          name: 'graduationYear',
          type: 'integer',
        },
        {
          name: 'major',
          type: 'varchar(255)',
        },
        {
          name: 'points',
          type: 'integer',
          default: 0,
        },
        {
          name: 'lastLogin',
          type: 'timestamptz',
          default: 'CURRENT_TIMESTAMP',
        },
      ],
    }));
    await queryRunner.createIndices(TABLE_NAME, [
      new TableIndex({
        name: 'users_uuid',
        columnNames: ['uuid'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'users_email',
        columnNames: ['email'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'users_access_code',
        columnNames: ['accessCode'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'leaderboard_index',
        columnNames: ['points'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
