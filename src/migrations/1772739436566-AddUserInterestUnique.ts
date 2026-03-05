import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserInterestUnique1772739436566 implements MigrationInterface {
    name = 'AddUserInterestUnique1772739436566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "interest_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, CONSTRAINT "UQ_a5e1c7f8bb035eb4363a10cddda" UNIQUE ("title"), CONSTRAINT "PK_9ab02516b80adc2bf3ce4ebc4fd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "interest" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "categoryId" uuid, CONSTRAINT "PK_6619d627e204e0596968653011f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_interest" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "interestId" uuid, CONSTRAINT "UQ_34dc415098c1b8caa114be60db3" UNIQUE ("userId", "interestId"), CONSTRAINT "PK_1c6d5a60c9ab471340bbebae61a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "interest" ADD CONSTRAINT "FK_392f27b93da27ae6a0417a9c77e" FOREIGN KEY ("categoryId") REFERENCES "interest_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_interest" ADD CONSTRAINT "FK_e7a1ea10dbef14192f738ceccde" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_interest" ADD CONSTRAINT "FK_479d7e7e43c9d1b83393dbb0c76" FOREIGN KEY ("interestId") REFERENCES "interest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_interest" DROP CONSTRAINT "FK_479d7e7e43c9d1b83393dbb0c76"`);
        await queryRunner.query(`ALTER TABLE "user_interest" DROP CONSTRAINT "FK_e7a1ea10dbef14192f738ceccde"`);
        await queryRunner.query(`ALTER TABLE "interest" DROP CONSTRAINT "FK_392f27b93da27ae6a0417a9c77e"`);
        await queryRunner.query(`DROP TABLE "user_interest"`);
        await queryRunner.query(`DROP TABLE "interest"`);
        await queryRunner.query(`DROP TABLE "interest_category"`);
    }

}
