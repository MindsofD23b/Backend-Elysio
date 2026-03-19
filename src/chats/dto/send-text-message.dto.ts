import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatMessageType } from '../enums/chat-message-type.enum';


class EncryptedKeyDTO {
    @IsUUID()
    userId: string;

    @IsString()
    @IsNotEmpty()
    encryptedKey: string;
}

export class SendTextMessageDTO {
    @IsEnum(ChatMessageType)
    type: ChatMessageType;

    @IsString()
    @IsNotEmpty()
    ciphertext: string;

    @IsString()
    @IsNotEmpty()
    iv: string;

    @IsString()
    @IsNotEmpty()
    authTag: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EncryptedKeyDTO)
    encryptedKeys: EncryptedKeyDTO[];
}