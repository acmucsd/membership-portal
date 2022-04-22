import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ChangePublicActivityType1605316601032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('Activities', new TableColumn({
      name: 'scope',
      type: 'varchar(255)',
      default: '\'HIDDEN\'',
    }));
    await queryRunner.query('UPDATE "Activities" SET scope = \'PUBLIC\' WHERE public = true');
    await queryRunner.query('UPDATE "Activities" SET scope = \'HIDDEN\' WHERE public = false');
    await queryRunner.dropColumn('Activities', 'public');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('Activities', new TableColumn({
      name: 'public',
      type: 'boolean',
      default: false,
    }));
    await queryRunner.query('UPDATE "Activities" SET public = true WHERE scope = \'PUBLIC\'');
    await queryRunner.query(
      'UPDATE "Activities" SET public = false WHERE scope = \'HIDDEN\' OR scope = \'PRIVATE\'',
    );
    await queryRunner.dropColumn('Activities', 'scope');
  }
}
