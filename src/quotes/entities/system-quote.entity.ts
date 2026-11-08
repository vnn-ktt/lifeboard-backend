import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export interface LocalizedText { ru: string; en: string; de: string }

/** System-managed catalog; clients cannot create or edit quote text. */
@Entity({ name: 'system_quotes' })
export class SystemQuote {
  @PrimaryColumn({ type: 'varchar', length: 64 }) id!: string;
  @Column({ type: 'jsonb' }) text!: LocalizedText;
  @Column({ type: 'jsonb' }) author!: LocalizedText;
  @Column({ name: 'source_title', type: 'jsonb' }) sourceTitle!: LocalizedText;
  @Column({ name: 'source_url', type: 'varchar', length: 1000 }) sourceUrl!: string;
  @Column({ type: 'varchar', length: 40, default: '' }) reference!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
