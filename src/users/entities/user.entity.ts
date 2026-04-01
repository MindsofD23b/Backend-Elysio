import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserInterest } from '../../interests/entities/user-interest.entity';
import { UserBlock } from '../../interests/entities/user-block.entity';
import { MatchHistory } from '../../interests/entities/match-history.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  phonePrefix: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column()
  gender: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'timestamp', nullable: true })
  dateOfBirth: Date;

  @Column()
  country: string;

  @Column()
  language: string;

  @Column()
  jobTitle: string;

  @Column()
  aboutMe: string;

  @Column({type: 'varchar', nullable: true })
  interestedIn: string;

  @Column({ type: 'int', nullable: true })
  minPreferredAge: number;

  @Column({ type: 'int', nullable: true })
  maxPreferredAge: number;

  @Column({type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ default: false })
  isBlockedFromMatching: boolean;

  @Column({ default: false })
  acceptedTerms: boolean;

  @Column({ default: false })
  acceptedPrivacyPolicy: boolean;

  @Column({type: 'timestamp', nullable: true })
  lastLogin: Date | null;

  @Column({ default: 'free' })
  subscriptionStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'text', nullable: true })
  publicKey: string | null;

  @Column({ type: 'text', nullable: true})
  deviceToken: string | null;

  @OneToMany(() => UserInterest, (ui) => ui.user)
  userInterests: UserInterest[];

  @OneToMany(() => UserBlock, () => undefined)
  blocksCreated: UserBlock[];

  @OneToMany(() => MatchHistory, () => undefined)
  matchesAsUserA: MatchHistory[];

  @OneToMany(() => MatchHistory, () => undefined)
  matchesAsUserB: MatchHistory[];
}
