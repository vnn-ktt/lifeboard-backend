import { IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateKey } from '@/utils/validators/is-date-key.decorator';
import type { GoalCheckinFrequency } from '@/goals/domain/goal-measurement';

export class GoalCheckinScheduleDto {
  @ApiProperty({ enum: ['off', 'manual', 'daily', 'weekly'], example: 'weekly' })
  @IsIn(['off', 'manual', 'daily', 'weekly'])
  frequency!: GoalCheckinFrequency;

  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 7 })
  @ValidateIf((dto: GoalCheckinScheduleDto) => dto.frequency === 'weekly')
  @IsInt() @Min(1) @Max(7)
  weekday?: number;

  @ApiProperty({ example: '2026-11-06', format: 'date' })
  @IsDateKey()
  fromDate!: string;
}

export function validateScheduleShape(input: GoalCheckinScheduleDto): boolean {
  return input.frequency === 'weekly' ? input.weekday !== undefined : input.weekday === undefined;
}
