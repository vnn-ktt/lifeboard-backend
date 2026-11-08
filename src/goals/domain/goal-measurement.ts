export type GoalMeasurement =
  | { type: 'activity' }
  | { type: 'binary' }
  | { type: 'numeric'; direction: 'increase' | 'decrease'; unit: string; startValue: number; targetValue: number };

/** HTTP compatibility: frontend v0.17.1 uses `kind`; v0.6.1 API used `type`. */
export type FrontendGoalMeasurement =
  | { kind: 'activity' }
  | { kind: 'binary' }
  | { kind: 'numeric'; direction: 'increase' | 'decrease'; unit: string; startValue: number; targetValue: number };
export type GoalMeasurementInput = GoalMeasurement | FrontendGoalMeasurement;
export type GoalMeasurementResponse = GoalMeasurement & { kind: GoalMeasurement['type'] };

export function normalizeGoalMeasurement(input: GoalMeasurementInput): GoalMeasurement {
  if ('type' in input) return input;
  const { kind, ...details } = input;
  return { type: kind, ...details } as GoalMeasurement;
}

export function presentGoalMeasurement(measurement: GoalMeasurement): GoalMeasurementResponse {
  // Both discriminators are intentionally returned until the existing v0.6.1 clients migrate.
  return { ...measurement, kind: measurement.type };
}

export type GoalCheckinFrequency = 'off' | 'manual' | 'daily' | 'weekly';
export interface GoalCheckinSchedule {
  frequency: GoalCheckinFrequency;
  weekday?: number;
  fromDate: string;
}

export function validGoalMeasurement(input: unknown): input is GoalMeasurementInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const obj = input as Record<string, unknown>;
  // Do not permit both discriminators or extra keys in persisted JSON.
  const discriminator = 'kind' in obj ? 'kind' : 'type';
  if ('kind' in obj && 'type' in obj) return false;
  const kind = obj[discriminator];
  if (kind === 'activity' || kind === 'binary') return Object.keys(obj).length === 1;
  if (kind !== 'numeric') return false;
  if (!['increase', 'decrease'].includes(String(obj.direction)) ||
    typeof obj.unit !== 'string' || obj.unit.length > 32 ||
    typeof obj.startValue !== 'number' || !Number.isFinite(obj.startValue) ||
    typeof obj.targetValue !== 'number' || !Number.isFinite(obj.targetValue) ||
    Math.abs(obj.startValue) > 1e12 || Math.abs(obj.targetValue) > 1e12 ||
    obj.startValue === obj.targetValue) return false;
  if (obj.direction === 'increase' && obj.targetValue < obj.startValue) return false;
  if (obj.direction === 'decrease' && obj.targetValue > obj.startValue) return false;
  return Object.keys(obj).sort().join(',') === ['direction', discriminator, 'startValue', 'targetValue', 'unit'].sort().join(',');
}
