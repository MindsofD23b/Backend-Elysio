import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicKeyToUser1773934702743 implements MigrationInterface {
  name = 'AddPublicKeyToUser1773934702743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chat_room" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userAId" uuid NOT NULL, "userBId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8aa3a52cf74c96469f0ef9fbe3e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0e6c15bfd0dad762fb0f47ea45" ON "chat_room" ("userAId", "userBId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_message_type_enum" AS ENUM('text', 'voice')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" uuid NOT NULL, "senderId" uuid NOT NULL, "type" "public"."chat_message_type_enum" NOT NULL DEFAULT 'text', "ciphertext" text, "iv" text, "authTag" text, "mediaUrl" text, "mediaDurationSec" text, "isDeleted" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3cc0d85193aade457d3077dd06b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_55dfd6d1589749727a7ef2d121" ON "chat_message" ("roomId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_message_key" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "messageId" uuid NOT NULL, "userId" uuid NOT NULL, "encryptedKey" text NOT NULL, CONSTRAINT "PK_3e47ae9c37e751b3f1d4f37f733" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_91237bd42c34e234f14d550608" ON "chat_message_key" ("messageId", "userId") `,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "publicKey" text`);
    await queryRunner.query(`ALTER TABLE "user" ADD "deviceToken" text`);
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_55dfd6d1589749727a7ef2d121f" FOREIGN KEY ("roomId") REFERENCES "chat_room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message_key" ADD CONSTRAINT "FK_cd5c7ed7e84d13a54191e71a4e8" FOREIGN KEY ("messageId") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_message_key" DROP CONSTRAINT "FK_cd5c7ed7e84d13a54191e71a4e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_55dfd6d1589749727a7ef2d121f"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deviceToken"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "publicKey"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_91237bd42c34e234f14d550608"`,
    );
    await queryRunner.query(`DROP TABLE "chat_message_key"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_55dfd6d1589749727a7ef2d121"`,
    );
    await queryRunner.query(`DROP TABLE "chat_message"`);
    await queryRunner.query(`DROP TYPE "public"."chat_message_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0e6c15bfd0dad762fb0f47ea45"`,
    );
    await queryRunner.query(`DROP TABLE "chat_room"`);
  }
}
