import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveReviewDto } from '@/reviews/dto/save-review.dto';
import type { WeeklyReviewResponseDto } from '@/reviews/dto/weekly-review-response.dto';
import { WeeklyReview } from '@/reviews/entities/weekly-review.entity';
import { isReviewRangeAllowed, reviewWeekStart } from '@/reviews/domain/review-rules';

function present(review: WeeklyReview): WeeklyReviewResponseDto {
  return {
    weekStart: review.weekStart,
    wins: review.wins,
    obstacles: review.obstacles,
    nextStep: review.nextStep,
    mood: review.mood,
    updatedAt: review.updatedAt.toISOString(),
  };
}

@Injectable()
export class ReviewsService {
  constructor(@InjectRepository(WeeklyReview) private readonly reviews: Repository<WeeklyReview>) {}

  async list(userId: string, from: string, to: string): Promise<WeeklyReviewResponseDto[]> {
    if (!isReviewRangeAllowed(from, to)) {
      throw new BadRequestException('Review date range must be 1 to 366 days, inclusive');
    }
    // Return weeks that intersect the requested calendar-day range.
    const items = await this.reviews.createQueryBuilder('review')
      .where('review.userId = :userId', { userId })
      .andWhere('review.weekStart >= :from AND review.weekStart <= :to', {
        from: reviewWeekStart(from),
        to: reviewWeekStart(to),
      })
      .orderBy('review.weekStart', 'DESC')
      .getMany();
    return items.map(present);
  }

  async get(userId: string, date: string): Promise<WeeklyReviewResponseDto> {
    const review = await this.reviews.findOneBy({ userId, weekStart: reviewWeekStart(date) });
    if (!review) throw new NotFoundException('Weekly review not found');
    return present(review);
  }

  async save(userId: string, date: string, input: SaveReviewDto): Promise<WeeklyReviewResponseDto> {
    const weekStart = reviewWeekStart(date);
    // Atomic PostgreSQL ON CONFLICT: concurrent PUTs cannot create duplicate weeks.
    // The most recent committed write wins, matching frontend saveReview semantics.
    await this.reviews.upsert({
      userId,
      weekStart,
      wins: input.wins,
      obstacles: input.obstacles,
      nextStep: input.nextStep,
      mood: input.mood,
    }, ['userId', 'weekStart']);
    const review = await this.reviews.findOneByOrFail({ userId, weekStart });
    return present(review);
  }

  async remove(userId: string, date: string): Promise<void> {
    // DELETE is idempotent: clearing a week twice remains successful.
    await this.reviews.delete({ userId, weekStart: reviewWeekStart(date) });
  }
}
