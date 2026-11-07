import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import type { GoalCheckinStatus } from '@/goal-checkins/entities/goal-checkin.entity';
import { IsDateKey } from '@/utils/validators/is-date-key.decorator';
import { trimString } from '@/utils/string-transformers';

export class CompleteCheckinDto {
  @ApiProperty({ example: '2026-11-08', format: 'date' })
  @IsDateKey() dueDate!: string;
  @ApiProperty({ enum: ['updated', 'unchanged', 'skipped'] })
  @IsIn(['updated', 'unchanged', 'skipped']) status!: GoalCheckinStatus;

  @ApiPropertyOptional({ type: Number, example: 35000 })
  @ValidateIf((dto: CompleteCheckinDto, value: unknown) => dto.status === 'updated' && value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 8 })
  @Min(-1_000_000_000_000) @Max(1_000_000_000_000)
  value?: number;

  @ApiPropertyOptional({ maxLength: 300, example: 'Deposit' })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString() @MaxLength(300)
  note?: string;
}
