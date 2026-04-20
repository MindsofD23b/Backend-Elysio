import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('profile_pictures')
export class ProfilePicture {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    r2Key: string; // the key stored in R2

    @Column({ default: false })
    isPrimary: boolean;

    @ManyToOne(() => User, (user) => user.profilePictures, { onDelete: 'CASCADE' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;
}