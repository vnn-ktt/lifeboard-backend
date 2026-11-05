import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'files' })
@Index('ix_files_user_created', ['userId', 'createdAt'])
export class StoredFile {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 255, unique: true })
  storageKey!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 180 })
  originalName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 20 })
  mimeType!: string;

  @Column({ type: 'integer' })
  size!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** A tombstone allows retrying object deletion when S3 is unavailable. */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
