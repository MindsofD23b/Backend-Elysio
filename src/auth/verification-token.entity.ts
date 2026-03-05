import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity()
export class VerificationToken {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    email: string

    @Column()
    token: string

    @Column('json')
    payload: any

    @CreateDateColumn()
    createdAt: Date
}