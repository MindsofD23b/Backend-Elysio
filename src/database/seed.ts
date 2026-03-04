import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)

    const userRepository: Repository<User> = app.get(getRepositoryToken(User))

    const existing = await userRepository.count()

    if (existing > 0) {
        console.log('Database already contains users. Skipping seed.')
        await app.close()
        return
    }

    const hashedPassword = await bcrypt.hash('12345678', 12)

    const users: Partial<User>[] = []

    for (let i = 0; i < 100; i++) {
        const gender = faker.helpers.arrayElement(['male', 'female'])

        users.push({
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            phoneNumber: '+4179' + faker.string.numeric(7),
            gender,
            firstName: faker.person.firstName(gender as any),
            lastName: faker.person.lastName(),
            dateOfBirth: faker.date.birthdate({
                min: 18,
                max: 35,
                mode: 'age',
            }),
            country: 'CH',
            language: faker.helpers.arrayElement(['de', 'en', 'fr']),
            jobTitle: faker.person.jobTitle(),
            aboutMe: faker.lorem.sentences(2),
            acceptedTerms: true,
            acceptedPrivacyPolicy: true,
            emailVerified: true,
            subscriptionStatus: faker.helpers.arrayElement([
                'free',
                'premium',
                'gold',
            ]),
        })
    }

    await userRepository.save(users)

    console.log('100 fake users seeded successfully.')
    await app.close()
}

bootstrap()