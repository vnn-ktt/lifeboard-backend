import { ApiProperty } from '@nestjs/swagger';
import { IsDateKey } from '@/utils/validators/is-date-key.decorator';

export class TaskDateQueryDto {
  @ApiProperty({ format: 'date' })
  @IsDateKey()
  date!: string;
}
