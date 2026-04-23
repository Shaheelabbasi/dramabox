import { MigrationInterface, QueryRunner } from "typeorm";

export class SubscriptionEntityupdate1776854194137 implements MigrationInterface {
    name = 'SubscriptionEntityupdate1776854194137'

    public async up(queryRunner: QueryRunner): Promise<void> {
      
        await queryRunner.query(`DROP INDEX "public"."IDX_user_subscriptions_user_status_ends_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_subscriptions_provider_subscription_id"`);

        await queryRunner.query(`ALTER TABLE "subscription_plans" DROP CONSTRAINT "CHK_subscription_plans_price_non_negative"`);
        await queryRunner.query(`ALTER TABLE "subscription_plans" DROP CONSTRAINT "CHK_subscription_plans_duration_days_positive"`);

        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT "CHK_user_subscriptions_status"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT "CHK_user_subscriptions_ends_after_start"`);


        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN "provider_subscription_id"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD "purchase_token" character varying`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD "provider_status" character varying`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD "is_acknowledged" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD "product_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN "product_id"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN "is_acknowledged"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN "provider_status"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN "purchase_token"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD "provider_subscription_id" character varying(150)`);
      
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD CONSTRAINT "CHK_user_subscriptions_ends_after_start" CHECK ((ends_at > starts_at))`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD CONSTRAINT "CHK_user_subscriptions_status" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'cancelled'::character varying, 'grace_period'::character varying, 'pending'::character varying])::text[])))`);
        
        await queryRunner.query(`CREATE INDEX "IDX_user_subscriptions_provider_subscription_id" ON "user_subscriptions" ("provider", "provider_subscription_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_subscriptions_user_status_ends_at" ON "user_subscriptions" ("ends_at", "status", "user_id") `);

        
    }

}
