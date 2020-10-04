import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddSlidingLeaderboardIndex1601840868173 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex('Activities', new TableIndex({
      name: 'sliding_leaderboard_index',
      columnNames: ['timestamp', 'pointsEarned'],
      where: '"pointsEarned" > 0',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('Activities', 'sliding_leaderboard_index');
  }
}
