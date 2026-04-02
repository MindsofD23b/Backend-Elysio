import { Put, UseGuards, Request, Controller, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePublicKeyDto } from './dto/update-public-key.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('me/public-key')
  @UseGuards(AuthGuard('jwt'))
  updatePublicKey(@Request() req, @Body() dto: UpdatePublicKeyDto) {
    return this.usersService.updatePublicKey(req.user.sub, dto.publicKey);
  }
}
