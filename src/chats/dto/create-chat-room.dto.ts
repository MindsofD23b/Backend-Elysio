import { IsUUID } from "class-validator";

export class CreateChatRoomDTO {
    @IsUUID()
    otherUserId: string;
}