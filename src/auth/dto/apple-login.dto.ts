import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AppleLoginDto {
    @IsString()
    identityToken: string;

    @IsOptional()
    @IsString()
    authorizationCode?: string;

    @IsOptional()
    @IsString()
    appleUserId?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsString()
    nickname?: string;

    @IsOptional()
    @IsNumber()
    realUserStatus?: number;
}