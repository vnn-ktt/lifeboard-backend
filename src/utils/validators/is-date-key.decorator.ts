import { registerDecorator } from 'class-validator';
import { isDateKey } from '@/utils/date-key';

export function IsDateKey(): PropertyDecorator {
  return (target, name) => registerDecorator({
    name: 'isDateKey', target: target.constructor, propertyName: String(name),
    validator: { validate: isDateKey, defaultMessage: () => 'Expected a valid YYYY-MM-DD date' },
  });
}
