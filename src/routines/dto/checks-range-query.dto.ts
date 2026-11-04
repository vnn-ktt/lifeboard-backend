import { IsDateKey } from '@/common/decorators/is-date-key.decorator';

export class ChecksRangeQueryDto {
  @IsDateKey()
  from!: string;

  @IsDateKey()
  to!: string;
}
