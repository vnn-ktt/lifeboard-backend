import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { trimString } from '@/utils/string-transformers';
import type { GoalHorizon } from '@/goals/entities/life-goal.entity';
import type { GoalMeasurementInput } from '@/goals/domain/goal-measurement';
import { IsGoalMeasurement } from '@/goals/dto/goal-measurement.dto';
import { GoalCheckinScheduleDto } from '@/goals/dto/goal-checkin-schedule.dto';
import { IsDateKey } from '@/utils/validators/is-date-key.decorator';

/** Null is rejected for regular fields, but explicitly allowed for parentId. */
export class UpdateGoalDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  areaId?: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['month', 'quarter', 'year', 'five-years'])
  horizon?: GoalHorizon;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  target?: number;


  @ValidateIf((_object, value: unknown) => value !== undefined)
  @ApiPropertyOptional({ description: 'Discriminator kind (v0.17.1) or type (legacy v0.6.1), plus numeric fields',
    example: { kind: 'numeric', direction: 'increase', unit: 'USD', startValue: 0, targetValue: 100000 } })
  @IsGoalMeasurement()
  measurement?: GoalMeasurementInput;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @ApiPropertyOptional({ format: 'date', nullable: true })
  @IsDateKey()
  startDate?: string | null;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @ApiPropertyOptional({ format: 'date', nullable: true })
  @IsDateKey()
  dueDate?: string | null;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @ApiPropertyOptional({ type: GoalCheckinScheduleDto, nullable: true })
  @ValidateNested()
  @Type(() => GoalCheckinScheduleDto)
  checkin?: GoalCheckinScheduleDto | null;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsUUID('4')
  parentId?: string | null;
}
