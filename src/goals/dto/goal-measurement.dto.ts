import { registerDecorator, ValidationOptions } from 'class-validator';
import { validGoalMeasurement } from '@/goals/domain/goal-measurement';

export function IsGoalMeasurement(options?: ValidationOptions): PropertyDecorator {
  return (target, name) => registerDecorator({
    name: 'isGoalMeasurement', target: target.constructor, propertyName: String(name), options,
    validator: { validate: validGoalMeasurement, defaultMessage: () => 'Invalid goal measurement' },
  });
}
