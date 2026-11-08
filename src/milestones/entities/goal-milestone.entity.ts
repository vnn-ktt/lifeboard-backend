import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('goal_milestones')
@Index('ix_goal_milestones_user_goal_order', ['userId', 'goalId', 'order', 'createdAt', 'id'])
@Index('ix_goal_milestones_goal_due', ['goalId', 'dueDate'])
export class GoalMilestone {
  @PrimaryColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'goal_id', type: 'uuid' }) goalId!: string;
  @Column({ type: 'varchar', length: 90 }) title!: string;
  @Column({ type: 'varchar', length: 500, default: '' }) description!: string;
  @Column({ type: 'integer', default: 0 }) order!: number;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate!: string | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
