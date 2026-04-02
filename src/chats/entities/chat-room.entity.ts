import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity()
@Index(['userAId', 'userBId'], { unique: true })
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userAId: string;

  @Column('uuid')
  userBId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
