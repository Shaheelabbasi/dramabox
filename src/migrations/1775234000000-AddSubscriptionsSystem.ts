import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionsSystem1775234000000 implements MigrationInterface {
  name = 'AddSubscriptionsSystem1775234000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "price" double precision NOT NULL,
        "duration_days" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "CHK_subscription_plans_price_non_negative" CHECK ("price" >= 0),
        CONSTRAINT "CHK_subscription_plans_duration_days_positive" CHECK ("duration_days" > 0),
        CONSTRAINT "PK_subscription_plans_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_subscriptions" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "plan_id" integer NOT NULL,
        "status" character varying(20) NOT NULL,
        "starts_at" bigint NOT NULL,
        "ends_at" bigint NOT NULL,
        "auto_renew" boolean NOT NULL DEFAULT false,
        "provider" character varying(30) NOT NULL,
        "provider_subscription_id" character varying(150),
        CONSTRAINT "CHK_user_subscriptions_status" CHECK ("status" IN ('active','expired','cancelled','grace_period','pending')),
        CONSTRAINT "CHK_user_subscriptions_ends_after_start" CHECK ("ends_at" > "starts_at"),
        CONSTRAINT "PK_user_subscriptions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "billing_transactions" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "subscription_id" integer,
        "amount" numeric(10,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'USD',
        "provider" character varying(30) NOT NULL,
        "provider_txn_id" character varying(150) NOT NULL,
        "status" character varying(20) NOT NULL,
        "raw_payload" jsonb,
        CONSTRAINT "CHK_billing_transactions_amount_non_negative" CHECK ("amount" >= 0),
        CONSTRAINT "CHK_billing_transactions_status" CHECK ("status" IN ('pending','paid','failed','refunded','chargeback')),
        CONSTRAINT "PK_billing_transactions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_billing_transactions_provider_txn"
      ON "billing_transactions" ("provider", "provider_txn_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_subscriptions_user_status_ends_at"
      ON "user_subscriptions" ("user_id", "status", "ends_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_subscriptions_provider_subscription_id"
      ON "user_subscriptions" ("provider", "provider_subscription_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_billing_transactions_user_created_at"
      ON "billing_transactions" ("user_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_billing_transactions_subscription_id"
      ON "billing_transactions" ("subscription_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_subscriptions"
      ADD CONSTRAINT "FK_user_subscriptions_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_subscriptions"
      ADD CONSTRAINT "FK_user_subscriptions_plan_id"
      FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_transactions"
      ADD CONSTRAINT "FK_billing_transactions_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_transactions"
      ADD CONSTRAINT "FK_billing_transactions_subscription_id"
      FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_transactions"
      DROP CONSTRAINT "FK_billing_transactions_subscription_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_transactions"
      DROP CONSTRAINT "FK_billing_transactions_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_subscriptions"
      DROP CONSTRAINT "FK_user_subscriptions_plan_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_subscriptions"
      DROP CONSTRAINT "FK_user_subscriptions_user_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_billing_transactions_subscription_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_billing_transactions_user_created_at"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_user_subscriptions_provider_subscription_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_user_subscriptions_user_status_ends_at"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."UQ_billing_transactions_provider_txn"
    `);

    await queryRunner.query(`
      DROP TABLE "billing_transactions"
    `);

    await queryRunner.query(`
      DROP TABLE "user_subscriptions"
    `);

    await queryRunner.query(`
      DROP TABLE "subscription_plans"
    `);
  }
}
