import { MigrationInterface, QueryRunner } from 'typeorm';

export class WatchHistoryEntity1775133000000 implements MigrationInterface {
  name = 'WatchHistoryEntity1775133000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "watch_history" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "episode_id" integer NOT NULL,
        "progress_seconds" integer NOT NULL DEFAULT 0,
        "completed" boolean NOT NULL DEFAULT false,
        "last_watched_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_watch_history_user_episode" UNIQUE ("user_id", "episode_id"),
        CONSTRAINT "PK_watch_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_watch_history_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_watch_history_episode_id" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "watch_history"`);
  }
}
