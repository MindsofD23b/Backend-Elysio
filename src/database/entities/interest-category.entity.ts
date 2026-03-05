import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Interest } from './interest.entity'

@Entity()
export class InterestCategory {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ unique: true })
    title: string

    @OneToMany(() => Interest, interest => interest.category)
    interests: Interest[]
}