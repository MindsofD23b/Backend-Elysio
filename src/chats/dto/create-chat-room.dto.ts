import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateChatRoomDTO {
  @IsUUID()
  @IsNotEmpty()
  otherUserId: string;
}
