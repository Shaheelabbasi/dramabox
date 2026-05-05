import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdWatchesEntity1777400000000 implements MigrationInterface {
  name = 'AdWatchesEntity1777400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ad_watches" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "user_id" integer,
        "event_type" character varying(100) NOT NULL DEFAULT 'ad_watch_completed',
        CONSTRAINT "PK_ad_watches_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ad_watches_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ad_watches"`);
  }
}
