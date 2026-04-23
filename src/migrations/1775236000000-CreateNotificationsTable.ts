import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1775236000000 implements MigrationInterface {
  name = 'CreateNotificationsTable1775236000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "type" character varying(100) NOT NULL,
        "resource_id" integer NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "user_id" integer,
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id"
      ON "notifications" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_read"
      ON "notifications" ("read")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_created_at"
      ON "notifications" ("created_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP CONSTRAINT "FK_notifications_user_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_notifications_created_at"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_notifications_read"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_notifications_user_id"
    `);

    await queryRunner.query(`
      DROP TABLE "notifications"
    `);
  }
}
