import {
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class MatchHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    userA: User;

    @ManyToOne(() => User)
    userB: User;

    @Column({ type: 'varchar', nullable: true })
    roomId: string | null;

    @Column({ type: 'varchar', default: 'matched' })
    outcome: string;

    @CreateDateColumn()
    createdAt: Date;
}