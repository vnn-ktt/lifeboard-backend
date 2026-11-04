export interface GoalProgressResponseDto {
  goalId: string;
  at: string;
  period: { from: string; toExclusive: string };
  done: number;
  target: number;
  percent: number;
}
