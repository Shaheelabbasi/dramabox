import { MigrationInterface, QueryRunner } from 'typeorm';

export class EpisodeEntity1775131200000 implements MigrationInterface {
  name = 'EpisodeEntity1775131200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "episodes" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "drama_id" integer NOT NULL,
        "episode_number" integer NOT NULL,
        "title" character varying(255) NOT NULL,
        "is_free" boolean NOT NULL DEFAULT false,
        "coin_cost" integer NOT NULL DEFAULT 0,
        "video_url" character varying(500) NOT NULL,
        CONSTRAINT "UQ_episodes_drama_episode_number" UNIQUE ("drama_id", "episode_number"),
        CONSTRAINT "PK_episodes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_episodes_drama_id" FOREIGN KEY ("drama_id") REFERENCES "dramas"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "episodes"`);
  }
}
