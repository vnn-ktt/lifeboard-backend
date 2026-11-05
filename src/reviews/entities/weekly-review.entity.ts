import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** One reflection per user and calendar week. The date is always a Monday. */
@Entity({ name: 'weekly_reviews' })
export class WeeklyReview {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'week_start', type: 'date' })
  weekStart!: string;

  @Column({ type: 'varchar', length: 1000, default: '' })
  wins!: string;

  @Column({ type: 'varchar', length: 1000, default: '' })
  obstacles!: string;

  @Column({ name: 'next_step', type: 'varchar', length: 1000, default: '' })
  nextStep!: string;

  @Column({ type: 'smallint' })
  mood!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
