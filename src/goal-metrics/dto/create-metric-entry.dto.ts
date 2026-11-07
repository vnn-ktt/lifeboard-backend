import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { trimString } from '@/utils/string-transformers';
import { IsDateKey } from '@/utils/validators/is-date-key.decorator';

export class CreateMetricEntryDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-11-06' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsDateKey()
  date?: string;

  @ApiProperty({ type: Number, example: 35000 })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 8 })
  @Min(-1_000_000_000_000) @Max(1_000_000_000_000)
  value!: number;

  @ApiPropertyOptional({ maxLength: 300, example: 'Savings' })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString() @MaxLength(300)
  note?: string | null;
}
