import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMatchmakingFields1774899886727 implements MigrationInterface {
    name = 'AddMatchmakingFields1774899886727'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_block" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "blockerId" uuid, "blockedId" uuid, CONSTRAINT "UQ_d6b2a9c90a8c5f0997c6548c725" UNIQUE ("blockerId", "blockedId"), CONSTRAINT "PK_4ccc8015091b2f9054ce0e40db5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "match_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" character varying, "outcome" character varying NOT NULL DEFAULT 'matched', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userAId" uuid, "userBId" uuid, CONSTRAINT "PK_efc236c939f8248229d873f4893" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user" ADD "interestedId" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ADD "minPreferredAge" integer`);
        await queryRunner.query(`ALTER TABLE "user" ADD "maxPreferredAge" integer`);
        await queryRunner.query(`ALTER TABLE "user" ADD "city" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ADD "latitude" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "longitude" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "isBlockedFromMatching" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user_block" ADD CONSTRAINT "FK_7eb0864a4303a6b9f8b2359fa0d" FOREIGN KEY ("blockerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_block" ADD CONSTRAINT "FK_4e6b2dd464fda99399eb61855cb" FOREIGN KEY ("blockedId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_history" ADD CONSTRAINT "FK_da025bc605cd26de2489f40ccc7" FOREIGN KEY ("userAId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_history" ADD CONSTRAINT "FK_fbba68ed2a22976d81f1c9eb376" FOREIGN KEY ("userBId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "match_history" DROP CONSTRAINT "FK_fbba68ed2a22976d81f1c9eb376"`);
        await queryRunner.query(`ALTER TABLE "match_history" DROP CONSTRAINT "FK_da025bc605cd26de2489f40ccc7"`);
        await queryRunner.query(`ALTER TABLE "user_block" DROP CONSTRAINT "FK_4e6b2dd464fda99399eb61855cb"`);
        await queryRunner.query(`ALTER TABLE "user_block" DROP CONSTRAINT "FK_7eb0864a4303a6b9f8b2359fa0d"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isBlockedFromMatching"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "longitude"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "latitude"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "maxPreferredAge"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "minPreferredAge"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "interestedId"`);
        await queryRunner.query(`DROP TABLE "match_history"`);
        await queryRunner.query(`DROP TABLE "user_block"`);
    }

}
