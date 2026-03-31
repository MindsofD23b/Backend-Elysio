import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { Interest } from './entities/interest.entity';
import { UserInterest } from './entities/user-interest.entity';
import { UserBlock } from './entities/user-block.entity';
import { MatchHistory } from './entities/match-history.entity';

type SwissCitySeed = {
  city: string;
  latitude: number;
  longitude: number;
};

const swissCities: SwissCitySeed[] = [
  { city: 'Zurich', latitude: 47.3769, longitude: 8.5417 },
  { city: 'Lucerne', latitude: 47.0502, longitude: 8.3093 },
  { city: 'Basel', latitude: 47.5596, longitude: 7.5886 },
  { city: 'Bern', latitude: 46.948, longitude: 7.4474 },
  { city: 'Lausanne', latitude: 46.5197, longitude: 6.6323 },
  { city: 'Geneva', latitude: 46.2044, longitude: 6.1432 },
  { city: 'Winterthur', latitude: 47.4988, longitude: 8.7237 },
  { city: 'St. Gallen', latitude: 47.4245, longitude: 9.3767 },
  { city: 'Lugano', latitude: 46.0037, longitude: 8.9511 },
  { city: 'Zug', latitude: 47.1662, longitude: 8.5155 },
];

function generateInterestedIn(gender: string): string {
  const options =
    gender === 'male'
      ? ['female', 'both']
      : gender === 'female'
        ? ['male', 'both']
        : ['male', 'female', 'both'];

  return faker.helpers.arrayElement(options);
}

function generatePreferredAgeRange() {
  const minPreferredAge = faker.number.int({ min: 18, max: 28 });
  const maxPreferredAge = faker.number.int({
    min: minPreferredAge + 2,
    max: 45,
  });

  return {
    minPreferredAge,
    maxPreferredAge,
  };
}

function generateUniqueSwissPhone(index: number): string {
  return `79${String(1000000 + index).padStart(7, '0')}`;
}

function pickDifferentUser(users: User[], currentUserId: string): User {
  const filtered = users.filter((user) => user.id !== currentUserId);
  return faker.helpers.arrayElement(filtered);
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const interestRepository = app.get<Repository<Interest>>(
    getRepositoryToken(Interest),
  );
  const userInterestRepository = app.get<Repository<UserInterest>>(
    getRepositoryToken(UserInterest),
  );
  const userBlockRepository = app.get<Repository<UserBlock>>(
    getRepositoryToken(UserBlock),
  );
  const matchHistoryRepository = app.get<Repository<MatchHistory>>(
    getRepositoryToken(MatchHistory),
  );

  const existingUsers = await userRepository.count();

  const allInterests = await interestRepository.find({
    relations: {
      category: true,
    },
  });

  if (allInterests.length === 0) {
    console.log(
      'No interests found. Run the interest seeder before seeding users.',
    );
    await app.close();
    return;
  }

  const hashedPassword = await bcrypt.hash('12345678', 12);
  const anzUsers = 50;
  const savedUsers: User[] = [];

  for (let i = 0; i < anzUsers; i++) {
    const gender = faker.helpers.arrayElement(['male', 'female']);
    const citySeed = faker.helpers.arrayElement(swissCities);
    const { minPreferredAge, maxPreferredAge } = generatePreferredAgeRange();

    const user = userRepository.create({
      email: faker.internet.email().toLowerCase(),
      password: hashedPassword,
      phonePrefix: '+41',
      phoneNumber: generateUniqueSwissPhone(existingUsers + i),
      emailVerified: true,
      gender,
      firstName: faker.person.firstName(gender as 'male' | 'female'),
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
      interestedIn: generateInterestedIn(gender),
      minPreferredAge,
      maxPreferredAge,
      city: citySeed.city,
      latitude: citySeed.latitude,
      longitude: citySeed.longitude,
      isBlockedFromMatching: false,
      acceptedTerms: true,
      acceptedPrivacyPolicy: true,
      lastLogin: faker.datatype.boolean()
        ? faker.date.recent({ days: 14 })
        : null,
      subscriptionStatus: faker.helpers.arrayElement([
        'free',
        'premium',
        'gold',
      ]),
    });

    const savedUser = await userRepository.save(user);
    savedUsers.push(savedUser);

    const pickedInterests = faker.helpers.arrayElements(
      allInterests,
      faker.number.int({ min: 3, max: 6 }),
    );

    const userInterestEntities = pickedInterests.map((interest) =>
      userInterestRepository.create({
        user: savedUser,
        interest,
      }),
    );

    await userInterestRepository.save(userInterestEntities);
  }

  const blockPairs = new Set<string>();
  const blocksToCreate: UserBlock[] = [];

  for (let i = 0; i < 8; i++) {
    const blocker = faker.helpers.arrayElement(savedUsers);
    const blocked = pickDifferentUser(savedUsers, blocker.id);
    const pairKey = `${blocker.id}:${blocked.id}`;

    if (blockPairs.has(pairKey)) {
      continue;
    }

    blockPairs.add(pairKey);

    blocksToCreate.push(
      userBlockRepository.create({
        blocker,
        blocked,
      }),
    );
  }

  if (blocksToCreate.length > 0) {
    await userBlockRepository.save(blocksToCreate);
  }

  const historyPairs = new Set<string>();
  const matchHistoriesToCreate: MatchHistory[] = [];

  for (let i = 0; i < 20; i++) {
    const userA = faker.helpers.arrayElement(savedUsers);
    const userB = pickDifferentUser(savedUsers, userA.id);
    const orderedKey = [userA.id, userB.id].sort().join(':');

    if (historyPairs.has(orderedKey)) {
      continue;
    }

    historyPairs.add(orderedKey);

    matchHistoriesToCreate.push(
      matchHistoryRepository.create({
        userA,
        userB,
        roomId: faker.datatype.boolean() ? faker.string.uuid() : null,
        outcome: faker.helpers.arrayElement([
          'matched',
          'skipped',
          'disconnected',
          'completed',
          'timeout',
        ]),
      }),
    );
  }

  if (matchHistoriesToCreate.length > 0) {
    await matchHistoryRepository.save(matchHistoriesToCreate);
  }

  console.log(`${savedUsers.length} fake users with interests seeded successfully.`);
  console.log(`${blocksToCreate.length} user blocks seeded successfully.`);
  console.log(`${matchHistoriesToCreate.length} match history records seeded successfully.`);

  await app.close();
}

bootstrap().catch((error) => {
  console.error('Error while seeding users:', error);
});