import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionPlanCurrencyAndBillingCycle1776357000000 implements MigrationInterface {
  name = 'AddSubscriptionPlanCurrencyAndBillingCycle1776357000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      ADD COLUMN "currency" character(3) NOT NULL DEFAULT 'USD'
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      ADD COLUMN "billing_cycle" character varying(20)
    `);

    await queryRunner.query(`
      UPDATE "subscription_plans"
      SET "billing_cycle" = 'monthly'
      WHERE "billing_cycle" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      ALTER COLUMN "billing_cycle" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      DROP COLUMN "billing_cycle"
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      DROP COLUMN "currency"
    `);
  }
}
