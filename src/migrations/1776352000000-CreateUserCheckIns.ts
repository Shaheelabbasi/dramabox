import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserCheckIns1776352000000 implements MigrationInterface {
  name = 'CreateUserCheckIns1776352000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_check_ins" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "check_in_at" bigint NOT NULL,
        CONSTRAINT "PK_user_check_ins_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_check_ins_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_check_ins_user_id"
      ON "user_check_ins" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_user_check_ins_user_id"
    `);

    await queryRunner.query(`
      DROP TABLE "user_check_ins"
    `);
  }
}
