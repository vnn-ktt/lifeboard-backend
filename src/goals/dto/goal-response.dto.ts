import type { GoalStatus } from '@/goal-status/domain/goal-status';
import type { GoalHorizon } from '@/goals/entities/life-goal.entity';
import type { GoalMeasurementResponse, GoalCheckinSchedule } from '@/goals/domain/goal-measurement';

export interface GoalResponseDto {
  id: string;
  areaId: string;
  title: string;
  description: string;
  horizon: GoalHorizon;
  target: number;
  measurement: GoalMeasurementResponse;
  startDate: string | null;
  dueDate: string | null;
  checkin?: GoalCheckinSchedule;
  parentId: string | null;
  status: GoalStatus;
  completedAt: string | null;
  createdAt: string;
}
