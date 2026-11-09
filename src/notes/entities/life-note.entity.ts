import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'notes' })
@Index('ix_notes_user_pinned_created', { synchronize: false })
@Index('ix_notes_user_group', ['userId', 'groupId'])
@Index('ix_notes_user_goal', ['userId', 'goalId'])
@Index('ix_notes_user_file', ['userId', 'imageFileId'])
export class LifeNote {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ type: 'varchar', length: 160 }) title!: string;
  @Column({ type: 'text', default: '' }) content!: string;
  @Column({ name: 'group_id', type: 'uuid', nullable: true }) groupId!: string | null;
  @Column({ name: 'goal_id', type: 'uuid', nullable: true }) goalId!: string | null;
  @Column({ name: 'image_file_id', type: 'uuid', nullable: true }) imageFileId!: string | null;
  @Column({ type: 'boolean', default: false }) pinned!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
