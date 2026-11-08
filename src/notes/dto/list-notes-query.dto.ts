import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsUUID, ValidateIf } from 'class-validator';

export class ListNotesQueryDto {
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsUUID('4')
  @ApiPropertyOptional({ format: 'uuid' }) groupId?: string;

  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsUUID('4')
  @ApiPropertyOptional({ format: 'uuid' }) goalId?: string;

  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['true','false'])
  @ApiPropertyOptional({ enum: ['true', 'false'] }) pinned?: string;
}
