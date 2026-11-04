/** Same JSON keys as src/modules/lifeboard/types.ts in frontend v0.14.1. */
export interface RoutineResponseDto {
  id: string;
  goalId: string;
  title: string;
  description: string;
  time: string;
  days: number[];
  durationMinutes: number;
}

export interface DayRoutinesResponseDto {
  date: string;
  routines: Array<RoutineResponseDto & { done: boolean }>;
  stats: { done: number; total: number; percent: number; durationMinutes: number };
}
