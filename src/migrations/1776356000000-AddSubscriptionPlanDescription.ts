import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionPlanDescription1776356000000 implements MigrationInterface {
  name = 'AddSubscriptionPlanDescription1776356000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      ADD COLUMN "description" character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      DROP COLUMN "description"
    `);
  }
}
