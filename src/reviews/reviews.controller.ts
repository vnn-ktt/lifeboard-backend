import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { ParseDateKeyPipe } from '@/common/pipes/parse-date-key.pipe';
import { ReviewRangeQueryDto } from '@/reviews/dto/review-range-query.dto';
import { SaveReviewDto } from '@/reviews/dto/save-review.dto';
import type { WeeklyReviewResponseDto } from '@/reviews/dto/weekly-review-response.dto';
import { ReviewsService } from '@/reviews/reviews.service';

/** All routes use the existing global session guard; userId comes only from the cookie. */
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ReviewRangeQueryDto,
  ): Promise<WeeklyReviewResponseDto[]> {
    return this.reviews.list(request.auth.user.id, query.from, query.to);
  }

  @Get(':date')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('date', ParseDateKeyPipe) date: string,
  ): Promise<WeeklyReviewResponseDto> {
    return this.reviews.get(request.auth.user.id, date);
  }

  @Put(':date')
  save(
    @Req() request: AuthenticatedRequest,
    @Param('date', ParseDateKeyPipe) date: string,
    @Body() input: SaveReviewDto,
  ): Promise<WeeklyReviewResponseDto> {
    return this.reviews.save(request.auth.user.id, date, input);
  }

  @Delete(':date')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('date', ParseDateKeyPipe) date: string,
  ): Promise<void> {
    return this.reviews.remove(request.auth.user.id, date);
  }
}
