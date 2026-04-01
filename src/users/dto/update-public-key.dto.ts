import { IsString, IsNotEmpty } from 'class-validator';

export class UpdatePublicKeyDto {
    @IsString()
    @IsNotEmpty()
    publicKey: string; 
}