import { Injectable } from '@nestjs/common';
import {
    createCipheriv,
    createDecipheriv,
    publicEncrypt,
    privateDecrypt,
    randomBytes,
    constants,
    CipherGCMTypes,
} from 'crypto';

@Injectable()
export class ChatCryptoService {
    private readonly ALGORITHM: CipherGCMTypes = 'aes-256-gcm';

    encryptMessage(plainText: string) {
        const aesKey = randomBytes(32);
        const iv = randomBytes(12); // GCM empfiehlt 12 Byte IV

        const cipher = createCipheriv(this.ALGORITHM, aesKey, iv);

        const encrypted = Buffer.concat([
            cipher.update(plainText, 'utf8'),
            cipher.final(),
        ]);

        const authTag = cipher.getAuthTag(); // funktioniert jetzt korrekt

        return {
            aesKey,
            ciphertext: encrypted.toString('base64'),
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
        };
    }

    decryptMessage(input: {
        encryptedKey: string;
        privateKeyPem: string;
        ciphertext: string;
        iv: string;
        authTag: string;
    }): string {
        const aesKey = privateDecrypt(
            {
                key: input.privateKeyPem,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            Buffer.from(input.encryptedKey, 'base64'),
        );

        const decipher = createDecipheriv(
            this.ALGORITHM,
            aesKey,
            Buffer.from(input.iv, 'base64'),
        );
        decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(input.ciphertext, 'base64')),
            decipher.final(),
        ]);

        return decrypted.toString('utf8');
    }

    encryptKeyForUser(aesKey: Buffer, publicKeyPem: string): string {
        return publicEncrypt(
            {
                key: publicKeyPem,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            aesKey,
        ).toString('base64');
    }
}