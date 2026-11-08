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
  if ('type' in input) {
    const { kind: _responseOnlyKind, ...persisted } = input as GoalMeasurementResponse;
    return persisted;
  }
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
  // The response contains both for backwards compatibility, and can be submitted again as-is.
  // Reject contradictory values and any unrelated properties.
  const discriminator = 'kind' in obj ? 'kind' : 'type';
  const both = 'kind' in obj && 'type' in obj;
  if (both && obj.kind !== obj.type) return false;
  const kind = obj[discriminator];
  if (kind === 'activity' || kind === 'binary') return Object.keys(obj).length === (both ? 2 : 1);
  if (kind !== 'numeric') return false;
  if (!['increase', 'decrease'].includes(String(obj.direction)) ||
    typeof obj.unit !== 'string' || obj.unit.length > 32 ||
    typeof obj.startValue !== 'number' || !Number.isFinite(obj.startValue) ||
    typeof obj.targetValue !== 'number' || !Number.isFinite(obj.targetValue) ||
    Math.abs(obj.startValue) > 1e12 || Math.abs(obj.targetValue) > 1e12 ||
    obj.startValue === obj.targetValue) return false;
  if (obj.direction === 'increase' && obj.targetValue < obj.startValue) return false;
  if (obj.direction === 'decrease' && obj.targetValue > obj.startValue) return false;
  return Object.keys(obj).sort().join(',') === ['direction', discriminator, 'startValue', 'targetValue', 'unit', ...(both ? ['type'] : [])].sort().join(',');
}
