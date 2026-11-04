import type { GoalHorizon } from '@/goals/entities/life-goal.entity';

export interface GoalResponseDto {
  id: string;
  areaId: string;
  title: string;
  description: string;
  horizon: GoalHorizon;
  target: number;
  parentId: string | null;
  createdAt: string;
}
