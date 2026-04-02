import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_message_key')
@Index(['messageId', 'userId'], { unique: true })
export class ChatMessageKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @ManyToOne(() => ChatMessage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: ChatMessage;

  @Column('uuid')
  userId: string;

  @Column({ type: 'text' })
  encryptedKey: string;
}
