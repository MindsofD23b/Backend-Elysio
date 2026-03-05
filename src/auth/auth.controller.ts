import { Controller, Post, Body, Get, Query } from '@nestjs/common'
import { AuthService } from './auth.service'
import { StartRegisterDto } from './dto/start-register.dto'
import { CompleteRegisterDto } from './dto/complete-register.dto'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('check-email')
  checkEmail(@Body() dto: StartRegisterDto) {
    return this.authService.checkEmail(dto.email)
  }

  @Post('register')
  register(@Body() dto: CompleteRegisterDto){
    return this.authService.startRegistration(dto)
  }

  @Get('verify-email')
  verify(@Query('token') token: string){
    return this.authService.verifyEmail(token)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }
}