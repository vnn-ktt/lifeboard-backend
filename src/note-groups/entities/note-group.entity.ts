import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'note_groups' })
@Index('ix_note_groups_user_created', ['userId', 'createdAt'])
@Index('ix_note_groups_goal', ['userId', 'goalId'])
export class NoteGroup {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'goal_id', type: 'uuid', nullable: true }) goalId!: string | null;
  @Column({ type: 'varchar', length: 90 }) name!: string;
  @Column({ type: 'char', length: 7, default: '#5b9478' }) color!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
