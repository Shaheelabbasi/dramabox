import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionBasePlansAndOffers1777200000000 implements MigrationInterface {
  name = 'AddSubscriptionBasePlansAndOffers1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subscription_base_plans" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "base_plan_id" character varying NOT NULL,
        "type" character varying NOT NULL DEFAULT 'auto-renewing',
        "billing_period" character varying NOT NULL,
        "grace_period_days" integer NOT NULL DEFAULT 3,
        "account_hold_days" integer NOT NULL DEFAULT 27,
        "resubscribe_allowed" boolean NOT NULL DEFAULT true,
        "customer_plan_changes" character varying NOT NULL DEFAULT 'charge_at_next_billing_date',
        "is_active" boolean NOT NULL DEFAULT true,
        "plan_id" integer NOT NULL,
        CONSTRAINT "PK_subscription_base_plans_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subscription_offers" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "offer_id" character varying NOT NULL,
        "type" character varying NOT NULL,
        "eligibility" character varying NOT NULL DEFAULT 'new_subscribers_only',
        "is_active" boolean NOT NULL DEFAULT true,
        "intro_price" double precision,
        "intro_duration_weeks" integer,
        "discount_percentage" double precision,
        "billing_periods" integer,
        "free_trial_days" integer,
        "base_plan_id" integer NOT NULL,
        CONSTRAINT "PK_subscription_offers_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_base_plans"
      ADD CONSTRAINT "FK_subscription_base_plans_plan_id"
      FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_offers"
      ADD CONSTRAINT "FK_subscription_offers_base_plan_id"
      FOREIGN KEY ("base_plan_id") REFERENCES "subscription_base_plans"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscription_offers"
      DROP CONSTRAINT "FK_subscription_offers_base_plan_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "subscription_base_plans"
      DROP CONSTRAINT "FK_subscription_base_plans_plan_id"
    `);

    await queryRunner.query(`
      DROP TABLE "subscription_offers"
    `);

    await queryRunner.query(`
      DROP TABLE "subscription_base_plans"
    `);
  }
}
