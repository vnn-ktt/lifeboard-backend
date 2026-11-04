import { IsDateKey } from '@/common/decorators/is-date-key.decorator';

export class DateQueryDto {
  @IsDateKey()
  date!: string;
}
