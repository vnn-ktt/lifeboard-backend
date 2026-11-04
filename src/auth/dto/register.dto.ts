import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail, normalizeNickname, trimString } from '@/utils/string-transformers';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @Length(2, 60)
  name!: string;

  @Transform(({ value }: { value: unknown }) => normalizeNickname(value))
  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}_.-]{2,24}$/u, { message: 'Invalid nickname' })
  nickname?: string | null;

  @Transform(({ value }: { value: unknown }) => normalizeEmail(value))
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
