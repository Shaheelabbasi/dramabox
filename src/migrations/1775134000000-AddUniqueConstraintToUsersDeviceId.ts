import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToUsersDeviceId1775134000000 implements MigrationInterface {
  name = 'AddUniqueConstraintToUsersDeviceId1775134000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_users_device_id" UNIQUE ("device_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "UQ_users_device_id"
    `);
  }
}
