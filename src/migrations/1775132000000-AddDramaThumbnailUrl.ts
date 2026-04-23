import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDramaThumbnailUrl1775132000000 implements MigrationInterface {
  name = 'AddDramaThumbnailUrl1775132000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dramas"
      ADD COLUMN "thumbnail_url" character 
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dramas"
      DROP COLUMN "thumbnail_url"
    `);
  }
}
