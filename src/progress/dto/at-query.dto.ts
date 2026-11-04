import { ValidateIf } from 'class-validator';
import { IsDateKey } from '@/common/decorators/is-date-key.decorator';

/** When omitted, progress uses UTC today. Clients should pass local YYYY-MM-DD. */
export class AtQueryDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsDateKey()
  at?: string;
}
