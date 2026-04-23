import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRewardsSystem1775232000000 implements MigrationInterface {
  name = 'AddRewardsSystem1775232000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "balance" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE "reward_rules" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "code" character varying(100) NOT NULL,
        "name" character varying(150) NOT NULL,
        "coins" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "cooldown_seconds" integer,
        "max_per_day" integer,
        CONSTRAINT "UQ_reward_rules_code" UNIQUE ("code"),
        CONSTRAINT "PK_reward_rules_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rewards_history" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "rule_id" integer,
        "entry_type" character varying(20) NOT NULL,
        "coins_delta" integer NOT NULL,
        "reference_type" character varying(50),
        "reference_id" character varying(100),
        "idempotency_key" character varying(255) NOT NULL,
        CONSTRAINT "UQ_rewards_history_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "PK_rewards_history_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rewards_history_user_id" ON "rewards_history" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rewards_history_rule_id" ON "rewards_history" ("rule_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rewards_history_created_at" ON "rewards_history" ("created_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "rewards_history"
      ADD CONSTRAINT "FK_rewards_history_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "rewards_history"
      ADD CONSTRAINT "FK_rewards_history_rule_id"
      FOREIGN KEY ("rule_id") REFERENCES "reward_rules"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rewards_history"
      DROP CONSTRAINT "FK_rewards_history_rule_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "rewards_history"
      DROP CONSTRAINT "FK_rewards_history_user_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_rewards_history_created_at"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_rewards_history_rule_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_rewards_history_user_id"
    `);

    await queryRunner.query(`
      DROP TABLE "rewards_history"
    `);

    await queryRunner.query(`
      DROP TABLE "reward_rules"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "balance"
    `);
  }
}
