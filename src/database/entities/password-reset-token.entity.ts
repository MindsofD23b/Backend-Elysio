import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity()
export class PasswordResetToken {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    email: string

    @Column({ unique: true })
    token: string

    @Column()
    expiresAt: Date

    @CreateDateColumn()
    createdAt: Date
}