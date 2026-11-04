import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { trimString } from '@/utils/string-transformers';

export class CreateRoutineDto {
  @IsUUID('4')
  goalId!: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MaxLength(3000)
  description!: string;

  @IsString()
  @Matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  time!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  days!: number[];

  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number;
}
