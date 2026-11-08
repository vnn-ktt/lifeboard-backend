import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { trimString, normalizeNickname } from '@/utils/string-transformers';

/** Email, password and identifiers cannot be modified through the profile endpoint. */
export class UpdateProfileDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString() @MinLength(1) @MaxLength(60)
  @ApiPropertyOptional({ maxLength: 60 })
  name?: string;

  @Transform(({ value }: { value: unknown }) => vNormalizeNickname(value))
  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsString() @MinLength(1) @MaxLength(24)
  @ApiPropertyOptional({ maxLength: 24, nullable: true })
  nickname?: string | null;

  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString() @MaxLength(400)
  @ApiPropertyOptional({ maxLength: 400 })
  about?: string;
}

function vNormalizeNickname(v: unknown): unknown {
  return v === null ? null : normalizeNickname(v);
}
