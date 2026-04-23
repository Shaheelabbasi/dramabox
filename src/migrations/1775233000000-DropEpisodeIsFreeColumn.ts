import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropEpisodeIsFreeColumn1775233000000 implements MigrationInterface {
  name = 'DropEpisodeIsFreeColumn1775233000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "episodes"
      DROP COLUMN "is_free"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "episodes"
      ADD COLUMN "is_free" boolean NOT NULL DEFAULT false
    `);
  }
}
