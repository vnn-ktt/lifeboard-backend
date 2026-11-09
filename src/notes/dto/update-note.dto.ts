import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { trimString } from '@/utils/string-transformers';

export class UpdateNoteDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString() @MinLength(1) @MaxLength(160)
  @ApiPropertyOptional()
  title?: string;

  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString() @MaxLength(20000)
  @ApiPropertyOptional({ maxLength: 20000 })
  content?: string;

  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsUUID('4')
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  groupId?: string | null;

  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsUUID('4')
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  goalId?: string | null;

  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsUUID('4')
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  imageFileId?: string | null;

  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  pinned?: boolean;
}
