import { IsBoolean } from 'class-validator';

export class SetCheckDto {
  @IsBoolean()
  done!: boolean;
}
