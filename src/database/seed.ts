import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'

// Made with ChatGPT

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


    const anzUsers = 50

    for (let i = 0; i < anzUsers; i++) {
        const gender = faker.helpers.arrayElement(['male', 'female'])

        users.push({
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            phonePrefix: '+41',
            phoneNumber: '79' + faker.string.numeric(7),
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

    console.log(`${anzUsers} fake users seeded successfully.`)
    await app.close()
}

bootstrap()