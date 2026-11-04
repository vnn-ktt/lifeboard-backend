import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  /** 0,1,2 = ordered focus goals; unique for each user. */
  @Column({ name: 'focus_position', type: 'smallint', nullable: true })
  focusPosition!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
