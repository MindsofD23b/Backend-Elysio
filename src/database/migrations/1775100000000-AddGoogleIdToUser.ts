import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleIdToUser1775100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "googleId" character varying UNIQUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "googleId"`);
  }
}
