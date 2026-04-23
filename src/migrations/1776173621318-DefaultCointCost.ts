import { MigrationInterface, QueryRunner } from 'typeorm';

export class DefaultCointCost1776173621318 implements MigrationInterface {
  name = 'DefaultCointCost1776173621318';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "episodes" ALTER COLUMN "coin_cost" SET DEFAULT '20'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "episodes" ALTER COLUMN "coin_cost" SET DEFAULT '0'`,
    );
  }
}
