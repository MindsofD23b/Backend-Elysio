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
  createRoom(@Request() req: any, @Body() dto: CreateChatRoomDTO) {
    return this.chatService.findOrCreateRoom(req.user.id, dto);
  }

  // GET /chat/rooms  → Alle Chats mit letzter Nachricht
  @Get('rooms')
  getRooms(@Request() req: any) {
    return this.chatService.getRoomsWithLastMessage(req.user.id);
  }

  // GET /chat/rooms/:roomId/messages?before=<ISO>&limit=30
  @Get('rooms/:roomId/messages')
  getMessages(
    @Request() req: any,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetMessagesQuery,
  ) {
    return this.chatService.getMessages(req.user.id, roomId, query);
  }

  // POST /chat/rooms/:roomId/messages  → Nachricht senden
  @Post('rooms/:roomId/messages')
  sendMessage(
    @Request() req: any,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: SendTextMessageDTO,
  ) {
    return this.chatService.sendMessage(req.user.id, roomId, dto);
  }

  @Get('rooms/:roomId/keys')
  getRoomPublicKeys(
    @Request() req: any,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.chatService.getRoomPublicKeys(req.user.id, roomId);
  }
}