import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interest } from './entities/interest.entity';
import { InterestCategory } from './entities/interest-category.entity';

@Injectable()
export class InterestsService {
  constructor(
    @InjectRepository(Interest)
    private interestRepository: Repository<Interest>,

    @InjectRepository(InterestCategory)
    private categoryRepo: Repository<InterestCategory>,
  ) {}

  async getAll() {
    const categories = await this.categoryRepo.find({
      relations: ['interests'],
    });
    const result = {};

    for (const category of categories) {
      result[category.title] = category.interests.map((i) => ({
        id: i.id,
        name: i.name,
      }));
    }

    return result;
  }
}
