import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'goal_metric_entries' })
@Index('ix_goal_metric_user_goal_date', ['userId', 'goalId', 'date', 'createdAt'])
export class GoalMetricEntry {
  @PrimaryColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'goal_id', type: 'uuid' }) goalId!: string;
  @Column({ type: 'date' }) date!: string;
  @Column({ type: 'double precision' }) value!: number;
  @Column({ type: 'varchar', length: 300, nullable: true }) note!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
