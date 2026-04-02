import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { ChatMessageType } from '../enums/chat-message-type.enum';

@Entity('chat_message')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  roomId: string;

  @ManyToOne(() => ChatRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @Column('uuid')
  senderId: string;

  @Column({
    type: 'enum',
    enum: ChatMessageType,
    default: ChatMessageType.TEXT,
  })
  type: ChatMessageType;

  @Column({ type: 'text', nullable: true })
  ciphertext: string | null;

  @Column({ type: 'text', nullable: true })
  iv: string | null;

  @Column({ type: 'text', nullable: true })
  authTag: string | null;

  @Column({ type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'text', nullable: true })
  mediaDurationSec: number | null;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
