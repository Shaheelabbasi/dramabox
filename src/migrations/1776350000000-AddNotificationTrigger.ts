import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTrigger1776350000000 implements MigrationInterface {
  name = 'AddNotificationTrigger1776350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD COLUMN "trigger" character varying(50)
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "type" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "trigger" SET DEFAULT 'auto'
    `);

    await queryRunner.query(`
      UPDATE "notifications"
      SET "trigger" = 'auto'
      WHERE "trigger" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "trigger" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "type" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "trigger" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP COLUMN "trigger"
    `);
  }
}
