import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoinPacksTable1777100000000 implements MigrationInterface {
  name = 'AddCoinPacksTable1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "coin_packs" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" character varying(500),
        "google_product_id" character varying(150) NOT NULL,
        "coins" integer NOT NULL,
        "bonus_coins" integer,
        "price" double precision NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'USD',
        "is_active" boolean NOT NULL DEFAULT true
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "coin_packs"
    `);
  }
}
