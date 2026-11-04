import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Only completed occurrences have rows; unchecking deletes the row. */
@Entity({ name: 'routine_checks' })
@Index('ix_routine_checks_user_date', ['userId', 'date'])
export class RoutineCheck {
  @PrimaryColumn({ name: 'routine_id', type: 'uuid' })
  routineId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'date' })
  date!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
