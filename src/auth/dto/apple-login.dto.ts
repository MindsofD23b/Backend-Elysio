import { IsString, IsOptional } from 'class-validator';

export class AppleLoginDto {
    identityToken: string;
    authorizationCode?: string;
    appleUserId?: string;
    email?: string;
    fullName?: string;
    nickname?: string;
    realUserStatus?: number;
}