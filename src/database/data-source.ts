import 'dotenv/config'
import { DataSource } from 'typeorm'
import { User } from '../users/user.entity'

export const AppDataSource = new DataSource({
    type: 'postgres',

    url: process.env.DATABASE_URL,

    entities: [User],
    migrations: ['src/migrations/*.ts'],

    synchronize: false,
    logging: false
})