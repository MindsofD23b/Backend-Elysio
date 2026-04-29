import { IsArray, IsUUID } from 'class-validator';

export class UpdateInterestsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  interestIds: string[];
}
