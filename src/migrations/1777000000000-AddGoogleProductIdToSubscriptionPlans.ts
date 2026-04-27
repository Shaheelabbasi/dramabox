import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleProductIdToSubscriptionPlans1777000000000
  implements MigrationInterface
{
  name = 'AddGoogleProductIdToSubscriptionPlans1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      ADD COLUMN "google_product_id" character varying
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_subscription_plans_google_product_id"
      ON "subscription_plans" ("google_product_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_subscription_plans_google_product_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
      DROP COLUMN "google_product_id"
    `);
  }
}
