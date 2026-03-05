import { IsEmail } from 'class-validator'

export class StartRegisterDto {
    @IsEmail()
    email: string
}