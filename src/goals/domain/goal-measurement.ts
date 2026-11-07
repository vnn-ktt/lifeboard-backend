export type GoalMeasurement =
  | { type: 'activity' }
  | { type: 'binary' }
  | { type: 'numeric'; direction: 'increase' | 'decrease'; unit: string; startValue: number; targetValue: number };

export type GoalCheckinFrequency = 'off' | 'manual' | 'daily' | 'weekly';
export interface GoalCheckinSchedule {
  frequency: GoalCheckinFrequency;
  weekday?: number;
  fromDate: string;
}

export function validGoalMeasurement(input: unknown): input is GoalMeasurement {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const obj = input as Record<string, unknown>;
  if (obj.type === 'activity' || obj.type === 'binary') return Object.keys(obj).length === 1;
  if (obj.type !== 'numeric') return false;
  if (!['increase', 'decrease'].includes(String(obj.direction)) ||
    typeof obj.unit !== 'string' || obj.unit.length > 32 ||
    typeof obj.startValue !== 'number' || !Number.isFinite(obj.startValue) ||
    typeof obj.targetValue !== 'number' || !Number.isFinite(obj.targetValue) ||
    Math.abs(obj.startValue) > 1e12 || Math.abs(obj.targetValue) > 1e12 ||
    obj.startValue === obj.targetValue) return false;
  if (obj.direction === 'increase' && obj.targetValue < obj.startValue) return false;
  if (obj.direction === 'decrease' && obj.targetValue > obj.startValue) return false;
  return Object.keys(obj).sort().join(',') === 'direction,startValue,targetValue,type,unit';
}
