import { MigrationInterface, QueryRunner } from 'typeorm';

export class EpisodeConstraintDrop1776770869412 implements MigrationInterface {
  name = 'EpisodeConstraintDrop1776770869412';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE watch_history
      DROP CONSTRAINT "UQ_watch_history_user_episode"
    `);
  }

    public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE watch_history
      ADD CONSTRAINT "UQ_watch_history_user_episode"
      UNIQUE (user_id, episode_id)
    `);
  }
}
