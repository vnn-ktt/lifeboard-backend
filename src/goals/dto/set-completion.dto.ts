import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCompletionDto {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  completed!: boolean;
}
