import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Interest } from '../interests/entities/interest.entity';
import { InterestCategory } from '../interests/entities/interest-category.entity';

// Made with ChatGPT
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const categoryRepo: Repository<InterestCategory> = app.get(
    getRepositoryToken(InterestCategory),
  );

  const interestRepo: Repository<Interest> = app.get(
    getRepositoryToken(Interest),
  );

  const data = {
    Sports: [
      'Sailing',
      'Football',
      'Tennis',
      'Basketball',
      'Golf',
      'Surfing',
      'Swimming',
      'Running',
      'Cycling',
      'Hiking',
      'Skiing',
      'Snowboarding',
    ],

    Music: [
      'Jazz',
      'Techno',
      'Rock',
      'Hip Hop',
      'Classical',
      'House',
      'EDM',
      'Indie',
      'Pop',
      'Metal',
      'Reggae',
      'Blues',
    ],

    Travel: [
      'Backpacking',
      'Road Trips',
      'City Trips',
      'Luxury Travel',
      'Beach Holidays',
      'Camping',
      'Vanlife',
      'Adventure Travel',
    ],

    Food: [
      'Cooking',
      'Fine Dining',
      'Street Food',
      'Wine Tasting',
      'Coffee',
      'BBQ',
      'Baking',
      'Healthy Eating',
    ],

    Lifestyle: [
      'Yoga',
      'Meditation',
      'Fitness',
      'Fashion',
      'Photography',
      'Blogging',
      'Entrepreneurship',
      'Volunteering',
    ],

    Technology: [
      'Programming',
      'AI',
      'Startups',
      'Cybersecurity',
      'Blockchain',
      'Robotics',
      'Gaming',
      'Gadgets',
    ],

    Entertainment: [
      'Movies',
      'Netflix',
      'Anime',
      'Board Games',
      'Video Games',
      'Standup Comedy',
      'Theater',
    ],

    Nature: [
      'Mountains',
      'Ocean',
      'Forests',
      'Animals',
      'Gardening',
      'Stargazing',
    ],
  };

  for (const categoryName of Object.keys(data)) {
    let category = await categoryRepo.findOne({
      where: { title: categoryName },
    });

    if (!category) {
      category = categoryRepo.create({ title: categoryName });
      await categoryRepo.save(category);
    }

    const interests: unknown = data[categoryName];

    for (const interestName of interests as Array<string>) {
      const exists = await interestRepo.findOne({
        where: { name: interestName },
      });

      if (!exists) {
        const interest = interestRepo.create({
          name: interestName,
          category,
        });

        await interestRepo.save(interest);
      }
    }
  }

  console.log('Interests seeded successfully');

  await app.close();
}

bootstrap().catch(() => console.error('Error'));
