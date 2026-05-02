import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStreakToUser1776700000002 implements MigrationInterface {
  name = 'AddStreakToUser1776700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "currentStreak" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "longestStreak" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "lastStreakWeek" varchar NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "consecutiveFreezes" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "consecutiveFreezes"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastStreakWeek"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "longestStreak"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "currentStreak"`);
  }
}
