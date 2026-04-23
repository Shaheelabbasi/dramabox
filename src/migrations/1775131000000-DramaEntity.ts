import { MigrationInterface, QueryRunner } from 'typeorm';

export class DramaEntity1775131000000 implements MigrationInterface {
  name = 'DramaEntity1775131000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dramas" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "is_exclusive" boolean NOT NULL DEFAULT false,
        "total_episodes" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_dramas_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dramas"`);
  }
}
