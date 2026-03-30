import {
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Unique(['blocker', 'blocked'])
@Entity()
export class UserBlock {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    blocker: User;

    @ManyToOne(() => User)
    blocked: User;

    @CreateDateColumn()
    createdAt: Date;
}