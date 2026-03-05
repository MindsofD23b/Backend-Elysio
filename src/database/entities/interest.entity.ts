import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne
} from 'typeorm'

import { InterestCategory } from './interest-category.entity'

@Entity()
export class Interest {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @ManyToOne(() => InterestCategory, category => category.interests)
    category: InterestCategory
}