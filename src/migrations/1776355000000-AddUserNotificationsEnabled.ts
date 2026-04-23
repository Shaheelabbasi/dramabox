import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNotificationsEnabled1776355000000 implements MigrationInterface {
  name = 'AddUserNotificationsEnabled1776355000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "notifications_enabled" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "notifications_enabled"
    `);
  }
}
