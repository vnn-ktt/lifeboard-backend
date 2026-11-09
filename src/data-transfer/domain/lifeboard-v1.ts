/** Lifeboard frontend v0.17.1 `LifeState`, persisted at lifeboard:state:v1.
 * Profile and browser authentication are outside this backup format. */
export type LegacyId = string;
export type Measurement = { kind: 'activity' | 'binary' } | {
  kind: 'numeric'; direction: 'increase' | 'decrease'; startValue: number; targetValue: number; unit: string;
};
export type GoalStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type GoalCheckinFrequency = 'off' | 'manual' | 'daily' | 'weekly';
export type GoalCheckinSchedule = { frequency: GoalCheckinFrequency; weekday?: number; fromDate: string };
export type Goal = {
  id: LegacyId; areaId: string; title: string; description: string;
  horizon: 'month' | 'quarter' | 'year' | 'five-years'; target: number;
  parentId?: LegacyId | null; createdAt: string; startDate?: string; dueDate?: string;
  measurement?: Measurement; checkin?: GoalCheckinSchedule;
  status?: GoalStatus; completedAt?: string | null;
};
export type Metric = { id: LegacyId; goalId: LegacyId; date: string; value: number; note: string; createdAt: string };
export type Checkin = { id: LegacyId; goalId: LegacyId; dueDate: string; completedAt: string;
  status: 'updated' | 'unchanged' | 'skipped'; metricEntryId?: LegacyId };
export type Milestone = { id: LegacyId; goalId: LegacyId; title: string; description: string; order: number;
  dueDate?: string; completedAt?: string | null; createdAt: string };
export type Task = { id: LegacyId; goalId: LegacyId; milestoneId: LegacyId | null; title: string; description: string;
  dueDate?: string; completedAt?: string | null; createdAt: string };
export type StatusEvent = { id: LegacyId; goalId: LegacyId; status: GoalStatus; changedAt: string };
export type Routine = { id: LegacyId; goalId: LegacyId; title: string; description: string;
  time: string; days: number[]; durationMinutes: number };
export type Review = { weekStart: string; wins: string; obstacles: string; nextStep: string;
  mood: number; updatedAt: string };
export type Area = { id: LegacyId; name: string; icon: string; accent: string; subtle: string };
export type NoteGroup = { id: LegacyId; name: string; goalId: LegacyId | null; color: string; createdAt: string };
export type Note = { id: LegacyId; title: string; content: string; groupId: LegacyId | null;
  goalId: LegacyId | null; imageDataUrl: string | null; pinned: boolean; createdAt: string; updatedAt: string };
export type Quote = { id: string; text: { ru: string; en: string; de: string };
  author: { ru: string; en: string; de: string }; sourceTitle: { ru: string; en: string; de: string };
  sourceUrl: string; reference: string; createdAt: string; createdBy: 'seed' };
export type ArchivedQuote = { id: string; text: { ru: string; en: string; de: string };
  author: string; createdAt?: string };
export type QuoteAssignments = { dashboard?: string | null; review?: string | null };
export type LifeStateV1 = {
  version: 1; vision: string; goals: Goal[]; routines: Routine[]; checks: Record<string, boolean>; reviews: Review[];
  goalMetricEntries?: Metric[]; goalCheckins?: Checkin[]; milestones?: Milestone[]; goalTasks?: Task[];
  goalStatusEvents?: StatusEvent[]; categories?: Area[]; focusGoalIds?: LegacyId[];
  noteGroups?: NoteGroup[]; notes?: Note[]; quotes?: Quote[]; archivedUserQuotes?: ArchivedQuote[];
  quoteAssignments?: QuoteAssignments;
};
export const BUILTIN_AREA_IDS = new Set(['dogs','career','leadership','health','finance','relationships','learning','other']);
export const MAX_IMPORT_BYTES = 5_000_000;
export const MAX_EXPORT_BYTES = 32_000_000;
