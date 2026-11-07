import type { GoalMeasurement } from '@/goals/domain/goal-measurement';

export interface GoalOutcome {
  type: GoalMeasurement['type'];
  percent: number;
  completed: boolean;
  currentValue: number | null;
  startValue?: number;
  targetValue?: number;
  unit?: string;
  direction?: 'increase' | 'decrease';
}

export function goalOutcome(measurement: GoalMeasurement, latestValue: number | null, activityPercent = 0): GoalOutcome {
  if (measurement.type === 'activity') {
    const percent = Math.max(0, Math.min(100, activityPercent));
    return { type: 'activity', percent, completed: percent >= 100, currentValue: null };
  }
  if (measurement.type === 'binary') {
    const percent = latestValue === 1 ? 100 : 0;
    return { type: 'binary', percent, completed: percent === 100, currentValue: latestValue ?? 0 };
  }
  const currentValue = latestValue ?? measurement.startValue;
  const percent = Math.min(100, Math.max(0,
    (currentValue - measurement.startValue) / (measurement.targetValue - measurement.startValue) * 100,
  ));
  return { type: 'numeric', percent, completed: percent >= 100, currentValue,
    startValue: measurement.startValue, targetValue: measurement.targetValue,
    unit: measurement.unit, direction: measurement.direction };
}
