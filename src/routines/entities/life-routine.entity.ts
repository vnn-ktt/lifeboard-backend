import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Mirrors the frontend LifeRoutine shape; userId stays internal. */
@Entity({ name: 'life_routines' })
@Index('ix_life_routines_user_time', ['userId', 'time'])
@Index('ix_life_routines_goal', ['goalId'])
export class LifeRoutine {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'goal_id', type: 'uuid' })
  goalId!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  /** Literal HH:mm, avoiding driver-specific time serialization. */
  @Column({ type: 'varchar', length: 5 })
  time!: string;

  /** ISO weekdays: Monday 1 through Sunday 7. */
  @Column({ type: 'smallint', array: true })
  days!: number[];

  @Column({ name: 'duration_minutes', type: 'smallint' })
  durationMinutes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
