import { MigrationInterface, QueryRunner } from 'typeorm';

export class MatchHistoryCreatedAtTimestamptz1776700000003 implements MigrationInterface {
  name = 'MatchHistoryCreatedAtTimestamptz1776700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "match_history" ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "match_history" ALTER COLUMN "createdAt" TYPE TIMESTAMP WITHOUT TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'`,
    );
  }
}
