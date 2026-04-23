import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFirebaseTokenToUsers1775235000000 implements MigrationInterface {
  name = 'AddFirebaseTokenToUsers1775235000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "firebase_token" character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "firebase_token"
    `);
  }
}
