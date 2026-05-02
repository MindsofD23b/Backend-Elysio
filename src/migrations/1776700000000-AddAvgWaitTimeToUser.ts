import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvgWaitTimeToUser1776700000000 implements MigrationInterface {
  name = 'AddAvgWaitTimeToUser1776700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "avgWaitTime" double precision NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avgWaitTime"`);
  }
}
