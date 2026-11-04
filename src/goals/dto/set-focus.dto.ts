import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { isString } from '@/utils/type-guards';

export class SetFocusDto {
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((id: unknown) => isString(id) ? id.toLowerCase() : id) : value)
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  goalIds!: string[];
}
