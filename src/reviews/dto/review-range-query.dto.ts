import { IsDateKey } from '@/common/decorators/is-date-key.decorator';

export class ReviewRangeQueryDto {
  @IsDateKey()
  from!: string;

  @IsDateKey()
  to!: string;
}
