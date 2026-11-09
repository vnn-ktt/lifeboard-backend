import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Exactly one successful import per canonical backup per authenticated user. */
@Entity({ name: 'lifeboard_imports' })
@Index('uq_lifeboard_import_hash', ['userId','snapshotHash'], { unique: true })
@Index('uq_lifeboard_import_key', ['userId','idempotencyKey'], { unique: true })
export class ImportAudit {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'snapshot_hash', type: 'char', length: 64 }) snapshotHash!: string;
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 }) idempotencyKey!: string;
  @Column({ name: 'id_map', type: 'jsonb' }) idMap!: Record<string, Record<string,string>>;
  @Column({ type: 'jsonb' }) counts!: Record<string,number>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
