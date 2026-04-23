import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionEntityUpdate1776855452722 implements MigrationInterface {
  name = 'TransactionEntityUpdate1776855452722';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "billing_transactions" ADD "purchase_token" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "billing_transactions" DROP COLUMN "purchase_token"`,
    );
  }
}
