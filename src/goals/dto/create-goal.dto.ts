import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { trimString } from '@/utils/string-transformers';
import type { GoalHorizon } from '@/goals/entities/life-goal.entity';

export class CreateGoalDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  areaId!: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MaxLength(3000)
  description!: string;

  @IsIn(['month', 'quarter', 'year', 'five-years'])
  horizon!: GoalHorizon;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  target!: number;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsUUID('4')
  parentId?: string | null;
}
