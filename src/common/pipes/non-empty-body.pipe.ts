import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isRecord } from '@/utils/type-guards';

/** PATCH must contain at least one defined property; ignore DTO class fields initialized to undefined. */
@Injectable()
export class NonEmptyBodyPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (!isRecord(value) || Object.values(value).every((entry) => entry === undefined)) {
      throw new BadRequestException('At least one field is required');
    }
    return value;
  }
}
