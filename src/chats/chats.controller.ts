import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
  Req
} from '@nestjs/common';
import { ChatService } from './chats.service';
import type { GetMessagesQuery } from './chats.service';
import { SendTextMessageDTO } from './dto/send-text-message.dto';
import { CreateChatRoomDTO } from './dto/create-chat-room.dto';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AuthGuard } from '@nestjs/passport';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  // POST /chat/rooms  → Room erstellen oder vorhandenen zurückgeben
  @Post('rooms')
  createRoom(
    @Req() req,
    @Body() dto: CreateChatRoomDTO,
  ) {
    console.log('req.user', req.user);
    console.log('req.user?.id', req.user?.sub);
    console.log('dto', dto);

    return this.chatService.findOrCreateRoom(req.user?.sub, dto);
  }

  // GET /chat/rooms  → Alle Chats mit letzter Nachricht
  @Get('rooms')
  getRooms(@Request() req: any) {
    return this.chatService.getRoomsWithLastMessage(req.user.sub);
  }

  // GET /chat/rooms/:roomId/messages?before=<ISO>&limit=30
  @Get('rooms/:roomId/messages')
  getMessages(
    @Request() req: any,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetMessagesQuery,
  ) {
    return this.chatService.getMessages(req.user.sub, roomId, query);
  }

  // POST /chat/rooms/:roomId/messages  → Nachricht senden
  @Post('rooms/:roomId/messages')
  sendMessage(
    @Request() req: any,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: SendTextMessageDTO,
  ) {
    return this.chatService.sendMessage(req.user.sub, roomId, dto);
  }

  @Get('rooms/:roomId/keys')
  getRoomPublicKeys(
    @Request() req: any,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.chatService.getRoomPublicKeys(req.user.sub, roomId);
  }
}