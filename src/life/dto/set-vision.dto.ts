import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';
import { trimString } from '@/utils/string-transformers';

export class SetVisionDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MaxLength(12_000)
  vision!: string;
}
