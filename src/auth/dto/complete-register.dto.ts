import {
  IsEmail,
  IsString,
  IsBoolean,
  IsDateString,
  MinLength,
  IsArray,
} from 'class-validator';

export class CompleteRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  phonePrefix: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  gender: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  country: string;

  @IsString()
  language: string;

  @IsString()
  jobTitle: string;

  @IsString()
  aboutMe: string;

  @IsBoolean()
  acceptedTerms: boolean;

  @IsBoolean()
  acceptedPrivacyPolicy: boolean;

  @IsArray()
  interests: string[];
}
