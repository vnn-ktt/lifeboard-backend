import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StatusEventsQueryDto {
  @ApiPropertyOptional({ description: 'Opaque cursor from X-Next-Cursor header' })
  @IsOptional() @IsString() @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 100 })
  @IsOptional() @Transform(({ value }: { value: unknown }) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value)
  @IsInt() @Min(1) @Max(100)
  limit?: number;
}
