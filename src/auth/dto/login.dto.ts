import { IsEmail, IsOptional, IsString } from 'class-validator'

export class LoginDto {

    @IsOptional()
    @IsEmail()
    email?: string

    @IsOptional()
    @IsString()
    phonePrefix?: string

    @IsOptional()
    @IsString()
    phoneNumber?: string

    @IsString()
    password: string
}