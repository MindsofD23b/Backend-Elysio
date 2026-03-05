import { Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm'

import { User } from './user.entity'
import { Interest } from './interest.entity'


@Unique(['user', 'interest'])
@Entity()
export class UserInterest {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @ManyToOne(() => User, user => user.userInterests)
    user: User

    @ManyToOne(() => Interest)
    interest: Interest
}