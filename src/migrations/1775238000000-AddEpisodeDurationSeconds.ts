import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEpisodeDurationSeconds1775238000000 implements MigrationInterface {
  name = 'AddEpisodeDurationSeconds1775238000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "episodes"
      ADD COLUMN "duration_seconds" integer
    `);

    await queryRunner.query(`
      UPDATE "episodes"
      SET "duration_seconds" = 1
      WHERE "duration_seconds" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "episodes"
      ALTER COLUMN "duration_seconds" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "episodes"
      DROP COLUMN "duration_seconds"
    `);
  }
}
