import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { GoalStatus } from '@/goal-status/domain/goal-status';
import type { GoalMeasurement, GoalCheckinFrequency } from '@/goals/domain/goal-measurement';

export type GoalHorizon = 'month' | 'quarter' | 'year' | 'five-years';

/** User-scoped goals. Ownership and parent relationship are enforced in SQL. */
@Entity({ name: 'life_goals' })
@Index('ix_life_goals_user_created', ['userId', 'createdAt'])
@Index('ix_life_goals_parent', ['parentId'])
@Index('ix_life_goals_area', ['areaId'])
@Index('uq_life_goals_focus_position', { synchronize: false })
export class LifeGoal {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'area_id', type: 'varchar', length: 64 })
  areaId!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'varchar', length: 12 })
  horizon!: GoalHorizon;

  @Column({ type: 'integer' })
  target!: number;

  @Column({ type: 'jsonb', default: () => `'{"type":"activity"}'::jsonb` })
  measurement!: GoalMeasurement;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ name: 'checkin_frequency', type: 'varchar', length: 8, nullable: true })
  checkinFrequency!: GoalCheckinFrequency | null;

  @Column({ name: 'checkin_weekday', type: 'smallint', nullable: true })
  checkinWeekday!: number | null;

  @Column({ name: 'checkin_from_date', type: 'date', nullable: true })
  checkinFromDate!: string | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  /** 0,1,2 = ordered focus goals; unique for each user. */
  @Column({ type: 'varchar', length: 12, default: 'active' })
  status!: GoalStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'focus_position', type: 'smallint', nullable: true })
  focusPosition!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
