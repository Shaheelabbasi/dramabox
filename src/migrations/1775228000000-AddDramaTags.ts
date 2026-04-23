import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDramaTags1775228000000 implements MigrationInterface {
  name = 'AddDramaTags1775228000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "slug" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_tags_slug" UNIQUE ("slug"),
        CONSTRAINT "UQ_tags_name" UNIQUE ("name"),
        CONSTRAINT "PK_tags_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "dramas"
      ADD COLUMN "tag_id" integer
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_dramas_tag_id" ON "dramas" ("tag_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "dramas"
      ADD CONSTRAINT "FK_dramas_tag_id"
      FOREIGN KEY ("tag_id") REFERENCES "tags"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dramas"
      DROP CONSTRAINT "FK_dramas_tag_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_dramas_tag_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "dramas"
      DROP COLUMN "tag_id"
    `);

    await queryRunner.query(`
      DROP TABLE "tags"
    `);
  }
}
