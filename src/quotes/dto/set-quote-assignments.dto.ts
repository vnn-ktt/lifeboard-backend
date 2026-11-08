import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Missing keys remain unchanged. null explicitly disables that placement. */
export class SetQuoteAssignmentsDto {
  @ApiPropertyOptional({ description: 'Existing system quote ID or null to hide', nullable: true })
  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsString() @MinLength(1) @MaxLength(64)
  dashboard?: string | null;

  @ApiPropertyOptional({ description: 'Existing system quote ID or null to hide', nullable: true })
  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsString() @MinLength(1) @MaxLength(64)
  review?: string | null;
}
