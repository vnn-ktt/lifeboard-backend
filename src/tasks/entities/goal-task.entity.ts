import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('goal_tasks')
@Index('ix_goal_tasks_user_goal_due', ['userId', 'goalId', 'dueDate', 'createdAt'])
@Index('ix_goal_tasks_user_open_due', { synchronize: false })
@Index('ix_goal_tasks_milestone', ['milestoneId'])
export class GoalTask {
  @PrimaryColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'goal_id', type: 'uuid' }) goalId!: string;
  @Column({ name: 'milestone_id', type: 'uuid', nullable: true }) milestoneId!: string | null;
  @Column({ type: 'varchar', length: 90 }) title!: string;
  @Column({ type: 'varchar', length: 500, default: '' }) description!: string;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate!: string | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
