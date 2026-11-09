import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { ArchivedQuote } from '@/data-transfer/domain/lifeboard-v1';

/** Preserve old user-generated quotes without reintroducing editable system quotes. */
@Entity({ name: 'archived_user_quotes' })
@Index('ix_archived_user_quotes_owner', ['userId'])
export class ArchivedUserQuote {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ type: 'jsonb' }) payload!: ArchivedQuote;
}
