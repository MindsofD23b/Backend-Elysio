import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfilePictures1776681281952 implements MigrationInterface {
    name = 'AddProfilePictures1776681281952'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "profile_pictures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "r2Key" character varying NOT NULL, "isPrimary" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_55851331ec0d252521dd1f7cde2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "profile_pictures" ADD CONSTRAINT "FK_980eb704bc96af9ee797c66dfc3" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profile_pictures" DROP CONSTRAINT "FK_980eb704bc96af9ee797c66dfc3"`);
        await queryRunner.query(`DROP TABLE "profile_pictures"`);
    }

}
