import { IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetAvatarDto {
  @ApiProperty({ description: 'Previously uploaded image UUID, null to clear avatar', nullable: true })
  @ValidateIf((_o, v: unknown) => v !== null)
  @IsUUID('4')
  fileId!: string | null;
}
