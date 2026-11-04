import { IsUUID, ValidateIf } from 'class-validator';

export class ListRoutinesQueryDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID('4')
  goalId?: string;
}
