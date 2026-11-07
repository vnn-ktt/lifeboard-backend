import { BadRequestException } from '@nestjs/common';
import type { GoalCheckinSchedule, GoalMeasurement } from '@/goals/domain/goal-measurement';
import type { GoalCheckinScheduleDto } from '@/goals/dto/goal-checkin-schedule.dto';
import { validateScheduleShape } from '@/goals/dto/goal-checkin-schedule.dto';
import { localDateKey } from '@/utils/timezone';
import type { LifeGoal } from '@/goals/entities/life-goal.entity';

export function scheduleOf(goal: LifeGoal): GoalCheckinSchedule | undefined {
  if (!goal.checkinFrequency || !goal.checkinFromDate) return undefined;
  return { frequency: goal.checkinFrequency, fromDate: goal.checkinFromDate,
    ...(goal.checkinFrequency === 'weekly' && goal.checkinWeekday !== null ? { weekday: goal.checkinWeekday } : {}) };
}

/** Only a change of frequency/weekday resets activation; past completed checks survive. */
export function assignSchedule(
  goal: LifeGoal, measurement: GoalMeasurement,
  requested: GoalCheckinScheduleDto | null | undefined,
  timezone: string, isNewType: boolean,
): void {
  if (measurement.type === 'activity') {
    if (requested !== undefined && requested !== null) {
      throw new BadRequestException('Activity goals do not accept check-in schedules');
    }
    goal.checkinFrequency = null;
    goal.checkinWeekday = null;
    goal.checkinFromDate = null;
    return;
  }
  if (requested && !validateScheduleShape(requested)) {
    throw new BadRequestException('weekday is required only for weekly schedules');
  }
  const frequency = requested?.frequency ?? (isNewType ? 'weekly' : goal.checkinFrequency ?? 'weekly');
  const weekday = frequency === 'weekly' ? (requested?.weekday ?? (isNewType ? 7 : goal.checkinWeekday ?? 7)) : null;
  const scheduleChanged = isNewType || goal.checkinFrequency !== frequency || goal.checkinWeekday !== weekday;
  if (scheduleChanged) {
    const today = localDateKey(timezone);
    // Imported/old payload dates cannot backdate a newly activated schedule.
    const fromDate = requested?.fromDate;
    goal.checkinFromDate = fromDate && fromDate > today ? fromDate : today;
  }
  goal.checkinFrequency = frequency;
  goal.checkinWeekday = weekday;
  if (!goal.checkinFromDate) goal.checkinFromDate = localDateKey(timezone);
}
