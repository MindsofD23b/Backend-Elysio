import {
  Controller,
  Post,
  Delete,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service.js';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto.js';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device-token')
  async registerDeviceToken(
    @Request() req: { user: { sub: string } },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    await this.notificationsService.registerDeviceToken(
      req.user.sub,
      dto.deviceToken,
    );
    return { message: 'Device token registered' };
  }

  @Delete('device-token')
  async removeDeviceToken(@Request() req) {
    await this.notificationsService.removeDeviceToken(req.user.sub);
    return { message: 'Device token removed' };
  }
}
