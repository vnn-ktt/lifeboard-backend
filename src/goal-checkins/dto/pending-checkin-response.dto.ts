import type { GoalOutcome } from '@/goal-metrics/domain/goal-outcome';

export interface PendingGoalCheckinResponseDto {
  goalId: string;
  dueDate: string;
  overdue: boolean;
  /** Count of pending dates AFTER the earliest one shown in dueDate. */
  pendingCount: number;
  outcome: GoalOutcome;
}
