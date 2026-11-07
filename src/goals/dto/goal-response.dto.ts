import type { GoalHorizon } from '@/goals/entities/life-goal.entity';
import type { GoalMeasurement, GoalCheckinSchedule } from '@/goals/domain/goal-measurement';

export interface GoalResponseDto {
  id: string;
  areaId: string;
  title: string;
  description: string;
  horizon: GoalHorizon;
  target: number;
  measurement: GoalMeasurement;
  startDate: string | null;
  dueDate: string | null;
  checkin?: GoalCheckinSchedule;
  parentId: string | null;
  createdAt: string;
}
