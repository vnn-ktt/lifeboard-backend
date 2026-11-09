import { Column, Entity, PrimaryColumn } from 'typeorm';

export type QuotePlacement = 'dashboard' | 'review';

@Entity({ name: 'quote_assignments' })
export class QuoteAssignment {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId!: string;
  @PrimaryColumn({ type: 'varchar', length: 12 }) placement!: QuotePlacement;
  @Column({ name: 'quote_id', type: 'varchar', length: 64, nullable: true }) quoteId!: string | null;
}
