import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { isDateKey } from '@/utils/date-key';

@Injectable()
export class ParseDateKeyPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (!isDateKey(value)) throw new BadRequestException('Expected a real date in YYYY-MM-DD format');
    return value;
  }
}
