import {
    IsEmail,
    IsString,
    IsBoolean,
    IsDateString,
    IsOptional,
    MinLength,
    Matches,
} from 'class-validator'

export class CreateUserDto {
    @IsEmail()
    email: string

    @IsString()
    @MinLength(8)
    password: string

    @IsString()
    @Matches(/^\+?[0-9]{8,15}$/)
    phoneNumber: string

    @IsString()
    gender: string

    @IsString()
    firstName: string

    @IsString()
    lastName: string

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string

    @IsString()
    country: string

    @IsString()
    language: string

    @IsString()
    jobTitle: string

    @IsString()
    aboutMe: string

    @IsBoolean()
    acceptedTerms: boolean

    @IsBoolean()
    acceptedPrivacyPolicy: boolean
}