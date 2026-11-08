export const GOAL_STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const;
export type GoalStatus = typeof GOAL_STATUSES[number];
/** Only explicit user transitions are events; initial/default active has no synthetic event. */
export function statusTransition(current: GoalStatus, next: GoalStatus): 'same' | 'changed' {
  return current === next ? 'same' : 'changed';
}
