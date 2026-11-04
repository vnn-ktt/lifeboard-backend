import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { trimString } from '@/utils/string-transformers';
import type { GoalHorizon } from '@/goals/entities/life-goal.entity';

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

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsUUID('4')
  parentId?: string | null;
}
