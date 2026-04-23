import { MigrationInterface, QueryRunner } from 'typeorm';

export class DramaGenreEntity1775131300000 implements MigrationInterface {
  name = 'DramaGenreEntity1775131300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "drama_genres" (
        "id" SERIAL NOT NULL,
        "drama_id" integer NOT NULL,
        "genre_id" integer NOT NULL,
        CONSTRAINT "UQ_drama_genres_drama_genre" UNIQUE ("drama_id", "genre_id"),
        CONSTRAINT "PK_drama_genres_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_drama_genres_drama_id" FOREIGN KEY ("drama_id") REFERENCES "dramas"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_drama_genres_genre_id" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "drama_genres"`);
  }
}
