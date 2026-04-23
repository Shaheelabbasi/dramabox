import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserStreaks1776841309780 implements MigrationInterface {
  name = 'UserStreaks1776841309780';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_streaks" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "user_id" integer NOT NULL, "current_streak" integer NOT NULL DEFAULT '0', "longest_streak" integer NOT NULL DEFAULT '0', "last_check_in_day" bigint, CONSTRAINT "UQ_91fc9bfd912d8ce3ae4be2ea193" UNIQUE ("user_id"), CONSTRAINT "REL_91fc9bfd912d8ce3ae4be2ea19" UNIQUE ("user_id"), CONSTRAINT "PK_a6d61a62372a94e55ca04ab8373" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_streaks" ADD CONSTRAINT "FK_91fc9bfd912d8ce3ae4be2ea193" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_streaks" DROP CONSTRAINT "FK_91fc9bfd912d8ce3ae4be2ea193"`,
    );

    await queryRunner.query(`DROP TABLE "user_streaks"`);
  }
}
