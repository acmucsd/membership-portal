import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const TABLE_NAME = 'OrderPickupEvents';

export class AddOrderPickupEventTable1631941497968 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: TABLE_NAME,
      columns: [
        {
          name: 'id',
          type: 'integer',
          isGenerated: true,
        },
        {
          name: 'uuid',
          type: 'uuid',
          isPrimary: true,
          isGenerated: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'title',
          type: 'varchar(255)',
        },
        {
          name: 'start',
          type: 'timestamptz',
        },
        {
          name: 'end',
          type: 'timestamptz',
        },
        {
          name: 'description',
          type: 'text',
        },
      ],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
