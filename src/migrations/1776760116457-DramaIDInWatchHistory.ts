import { MigrationInterface, QueryRunner } from "typeorm";

export class DramaIDInWatchHistory1776760116457 implements MigrationInterface {
    name = 'DramaIDInWatchHistory1776760116457'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "watch_history" ADD "drama_id" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "watch_history" DROP COLUMN "drama_id"`);
    }
}