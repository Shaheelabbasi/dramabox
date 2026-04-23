import { MigrationInterface, QueryRunner } from "typeorm";

export class EpisodeViewLog1776771987005 implements MigrationInterface {
    name = 'EpisodeViewLog1776771987005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "episode_view_log" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "user_id" integer, "episode_id" integer, CONSTRAINT "UQ_56748132703d70d2e5d7788f770" UNIQUE ("user_id", "episode_id"), CONSTRAINT "PK_791c3029abeb78472b6c3a01640" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "episode_view_log" ADD CONSTRAINT "FK_ec036183adfdeda2c816f3a5365" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "episode_view_log" ADD CONSTRAINT "FK_e13a7bf34c0d0580a51c27028a2" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE episode_view_log ADD CONSTRAINT UQ_episode_view_log UNIQUE (user_id, episode_id)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "episode_view_log" DROP CONSTRAINT "FK_e13a7bf34c0d0580a51c27028a2"`);
        await queryRunner.query(`ALTER TABLE "episode_view_log" DROP CONSTRAINT "FK_ec036183adfdeda2c816f3a5365"`);
        await queryRunner.query(`ALTER TABLE episode_view_log DROP CONSTRAINT UQ_episode_view_log`);
        await queryRunner.query(`DROP TABLE "episode_view_log"`);

    }

}
