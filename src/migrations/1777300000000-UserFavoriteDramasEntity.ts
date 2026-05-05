import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserFavoriteDramasEntity1777300000000
  implements MigrationInterface
{
  name = 'UserFavoriteDramasEntity1777300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "favorite_dramas" (
        "id" SERIAL NOT NULL,
        "user_id" integer,
        "drama_id" integer,
        "episode_id" integer,
        CONSTRAINT "PK_user_favorite_dramas_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_favorite_dramas_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_favorite_dramas_drama_id" FOREIGN KEY ("drama_id") REFERENCES "dramas"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_favorite_dramas_episode_id" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "favorite_dramas"`);
  }
}
