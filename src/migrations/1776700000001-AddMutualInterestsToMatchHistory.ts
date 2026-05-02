import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMutualInterestsToMatchHistory1776700000001 implements MigrationInterface {
  name = 'AddMutualInterestsToMatchHistory1776700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "match_history" ADD "mutualInterests" integer NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "match_history" DROP COLUMN "mutualInterests"`,
    );
  }
}
