import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({unique: true})
    email: string;

    @Column()
    password: string;

    @Column({unique: true})
    phoneNumber: string;

    @Column({default: false})
    emailVerified: boolean;

    @Column()
    gender: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({nullable: true})
    dateOfBirth: Date;

    @Column()
    country: string;

    @Column()
    language: string;

    @Column()
    jobTitle: string;

    @Column()
    aboutMe: string;

    @Column({default: false})
    acceptedTerms: boolean;

    @Column({default: false})
    acceptedPrivacyPolicy: boolean;

    @Column({nullable: true})
    lastLogin: Date;

    @CreateDateColumn()
    createdAt: Date;
}