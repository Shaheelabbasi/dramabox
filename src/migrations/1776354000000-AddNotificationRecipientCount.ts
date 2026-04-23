import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationRecipientCount1776354000000 implements MigrationInterface {
  name = 'AddNotificationRecipientCount1776354000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD COLUMN "recipient_count" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP COLUMN "recipient_count"
    `);
  }
}
