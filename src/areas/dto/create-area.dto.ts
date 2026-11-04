import { Transform } from 'class-transformer';
import { IsHexColor, IsString, Length, ValidateIf } from 'class-validator';
import { normalizeHexColor, trimString } from '@/utils/string-transformers';

export class CreateAreaDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @Length(2, 35)
  name!: string;

  @Transform(({ value }: { value: unknown }) => normalizeHexColor(value))
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @IsHexColor()
  @Length(7, 7)
  accent?: string;
}
