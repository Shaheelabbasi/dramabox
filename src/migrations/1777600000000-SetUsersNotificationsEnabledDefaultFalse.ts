import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetUsersNotificationsEnabledDefaultFalse1777600000000
  implements MigrationInterface
{
  name = 'SetUsersNotificationsEnabledDefaultFalse1777600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "notifications_enabled" SET DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "notifications_enabled" SET DEFAULT true
    `);
  }
}
