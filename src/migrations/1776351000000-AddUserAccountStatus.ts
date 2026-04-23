import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAccountStatus1776351000000 implements MigrationInterface {
  name = 'AddUserAccountStatus1776351000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "account_status" character varying(50) NOT NULL DEFAULT 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "account_status"
    `);
  }
}
