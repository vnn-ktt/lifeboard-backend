import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, ValidateIf, ValidateNested } from 'class-validator';
import type { Theme, Language, GoalEntryMode } from '@/preferences/entities/user-preferences.entity';

export class PrivacyPreferencesDto {
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean }) showAvatar?: boolean;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean }) maskStats?: boolean;
}

export class UpdatePreferencesDto {
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['default', 'dark', 'orange'])
  @ApiPropertyOptional({ enum: ['default','dark','orange'] }) theme?: Theme;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['ru', 'en', 'de'])
  @ApiPropertyOptional({ enum: ['ru','en','de'] }) language?: Language;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['wizard', 'quick'])
  @ApiPropertyOptional({ enum: ['wizard','quick'] }) goalEntryMode?: GoalEntryMode;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean }) showHelper?: boolean;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsObject() @ValidateNested() @Type(() => PrivacyPreferencesDto)
  @ApiPropertyOptional({ type: PrivacyPreferencesDto })
  privacy?: PrivacyPreferencesDto;
}
