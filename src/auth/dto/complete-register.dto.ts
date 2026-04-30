import {
  IsEmail,
  IsString,
  IsBoolean,
  IsDateString,
  MinLength,
  IsArray,
  IsOptional,
  IsNumber,
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

  @IsOptional()
  @IsString()
  interestedIn?: string;

  @IsOptional()
  @IsNumber()
  minPreferredAge?: number;

  @IsOptional()
  @IsNumber()
  maxPreferredAge?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
