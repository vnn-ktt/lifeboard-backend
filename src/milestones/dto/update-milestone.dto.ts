import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { IsDateKey } from '@/utils/validators/is-date-key.decorator';
import { trimString } from '@/utils/string-transformers';

export class UpdateMilestoneDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 90 })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsString() @MinLength(2) @MaxLength(90)
  title?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @IsInt() @Min(0) @Max(10000)
  order?: number;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  @ValidateIf((_obj, value: unknown) => value !== undefined && value !== null)
  @IsDateKey()
  dueDate?: string | null;
}
