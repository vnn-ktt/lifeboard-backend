import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Built-in areas have userId = null and stable IDs matching Vue's seed.ts. */
@Entity({ name: 'life_areas' })
@Index('ix_life_areas_user_id', ['userId'])
@Index('uq_life_areas_user_name', { synchronize: false })
export class LifeArea {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 35 })
  name!: string;

  @Column({ type: 'varchar', length: 60 })
  icon!: string;

  @Column({ type: 'char', length: 7 })
  accent!: string;

  @Column({ type: 'char', length: 7 })
  subtle!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
