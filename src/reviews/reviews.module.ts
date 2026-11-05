import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyReview } from '@/reviews/entities/weekly-review.entity';
import { ReviewsController } from '@/reviews/reviews.controller';
import { ReviewsService } from '@/reviews/reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyReview])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
