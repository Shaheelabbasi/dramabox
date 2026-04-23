import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationAudience1776353000000 implements MigrationInterface {
  name = 'AddNotificationAudience1776353000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD COLUMN "audience" character varying(50) NOT NULL DEFAULT 'allUsers'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP COLUMN "audience"
    `);
  }
}
