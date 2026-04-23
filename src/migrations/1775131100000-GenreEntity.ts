import { MigrationInterface, QueryRunner } from 'typeorm';

export class GenreEntity1775131100000 implements MigrationInterface {
  name = 'GenreEntity1775131100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "genres" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        CONSTRAINT "UQ_genres_name" UNIQUE ("name"),
        CONSTRAINT "PK_genres_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "genres"`);
  }
}
