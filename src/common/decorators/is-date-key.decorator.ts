import { ValidateBy, type ValidationOptions } from 'class-validator';
import { isDateKey } from '@/utils/date-key';

export function IsDateKey(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy({
    name: 'isDateKey',
    validator: {
      validate: (value: unknown) => isDateKey(value),
      defaultMessage: () => 'Date must be a real calendar date in YYYY-MM-DD format',
    },
  }, options);
}
