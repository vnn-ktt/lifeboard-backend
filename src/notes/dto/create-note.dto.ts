import { Transform } from 'class-transformer';
import { IsBoolean, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimString } from '@/utils/string-transformers';

export class CreateNoteDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString() @MinLength(1) @MaxLength(160)
  @ApiProperty({ example: 'Release notes' })
  title!: string;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString() @MaxLength(20000)
  @ApiPropertyOptional({ maxLength: 20000 })
  content?: string;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID('4')
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  groupId?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID('4')
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  goalId?: string | null;

  @ApiPropertyOptional({ description: 'UUID returned by POST /files. Never send imageDataUrl.', format: 'uuid', nullable: true })
  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID('4')
  imageFileId?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  pinned?: boolean;
}
