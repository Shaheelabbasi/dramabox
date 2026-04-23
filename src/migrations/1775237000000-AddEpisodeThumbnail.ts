import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEpisodeThumbnail1775237000000 implements MigrationInterface {
  name = 'AddEpisodeThumbnail1775237000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "episodes"
      ADD COLUMN "thumbnail" character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "episodes"
      DROP COLUMN "thumbnail"
    `);
  }
}
