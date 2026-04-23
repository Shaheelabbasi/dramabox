import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixDramaThumbnailUrlColumnType1775211000000 implements MigrationInterface {
  name = 'FixDramaThumbnailUrlColumnType1775211000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dramas"
      ALTER COLUMN "thumbnail_url" TYPE character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dramas"
      ALTER COLUMN "thumbnail_url" TYPE character(1)
    `);
  }
}
