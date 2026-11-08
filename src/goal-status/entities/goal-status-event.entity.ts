import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import type { GoalStatus } from '@/goal-status/domain/goal-status';

@Entity('goal_status_events')
@Index('ix_goal_status_events_goal_changed', ['goalId', 'changedAt', 'id'])
@Index('ix_goal_status_events_user_goal', ['userId', 'goalId'])
export class GoalStatusEvent {
  @PrimaryColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'goal_id', type: 'uuid' }) goalId!: string;
  @Column({ type: 'varchar', length: 12 }) status!: GoalStatus;
  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' }) changedAt!: Date;
}
