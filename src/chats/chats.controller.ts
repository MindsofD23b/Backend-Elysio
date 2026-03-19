import { Body, Controller, Get, Param, Post, Req, UseGuards, } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChatRoomDTO } from './dto/create-chat-room.dto';
import { SendTextMessageDTO } from './dto/send-text-message.dto';
import { AuthGuard } from '@nestjs/passport'

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) { }

  @Post('rooms')
  createroom(@Req() req, @Body() dto: CreateChatRoomDTO) {
    return this.chatsService.createRoom(req.user.id, dto);
  }

  @Post('rooms/:roomId/messages')
  sendMessage(
    @Req() req,
    @Param('roomId') roomId: string,
    @Body() dto: SendTextMessageDTO,
  ) {
    return this.chatsService.sendTextMessage(req.user.id, roomId, dto)
  }

  @Get('rooms/:roomId/messages')
  getMessages(@Req() req, @Param('roomId') roomId: string) {
    return this.chatsService.getMessages(req.user.id, roomId)
  }
}
