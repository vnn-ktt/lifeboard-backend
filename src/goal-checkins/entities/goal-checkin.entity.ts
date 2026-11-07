import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
export type GoalCheckinStatus = 'updated' | 'unchanged' | 'skipped';

@Entity({ name: 'goal_checkins' })
@Index('uq_goal_checkin_goal_date', ['goalId', 'dueDate'], { unique: true })
@Index('ix_goal_checkins_user_goal_date', ['userId', 'goalId', 'dueDate'])
export class GoalCheckin {
  @PrimaryColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'goal_id', type: 'uuid' }) goalId!: string;
  @Column({ name: 'due_date', type: 'date' }) dueDate!: string;
  @CreateDateColumn({ name: 'completed_at', type: 'timestamptz' }) completedAt!: Date;
  @Column({ type: 'varchar', length: 12 }) status!: GoalCheckinStatus;
  @Column({ name: 'metric_entry_id', type: 'uuid', nullable: true }) metricEntryId!: string | null;
}
