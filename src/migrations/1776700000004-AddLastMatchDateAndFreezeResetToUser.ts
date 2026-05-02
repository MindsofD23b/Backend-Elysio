import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastMatchDateAndFreezeResetToUser1776700000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lastMatchDate" varchar NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lastFreezeReset" varchar NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "lastFreezeReset"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "lastMatchDate"`,
    );
  }
}
