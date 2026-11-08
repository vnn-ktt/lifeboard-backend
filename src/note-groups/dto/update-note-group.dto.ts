import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Matches, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { trimString, normalizeHexColor } from '@/utils/string-transformers';

export class UpdateNoteGroupDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString() @MinLength(1) @MaxLength(90)
  @ApiPropertyOptional({ example: 'Planning' })
  name?: string;

  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsUUID('4')
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  goalId?: string | null;

  @Transform(({ value }: { value: unknown }) => normalizeHexColor(value))
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @Matches(/^#[0-9a-f]{6}$/)
  @ApiPropertyOptional({ example: '#336699' })
  color?: string;
}
