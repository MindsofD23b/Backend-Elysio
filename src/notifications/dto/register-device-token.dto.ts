import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  deviceToken: string;
}
