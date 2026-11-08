import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type EntityManager } from 'typeorm';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { SystemQuote } from '@/quotes/entities/system-quote.entity';
import { QuoteAssignment, type QuotePlacement } from '@/quotes/entities/quote-assignment.entity';
import type { SetQuoteAssignmentsDto } from '@/quotes/dto/set-quote-assignments.dto';

export interface QuoteResponse {
  id: string; text: SystemQuote['text']; author: SystemQuote['author']; sourceTitle: SystemQuote['sourceTitle'];
  sourceUrl: string; reference: string; createdAt: string; createdBy: 'seed';
}
export function presentQuote(item: SystemQuote): QuoteResponse {
  return { id: item.id, text: item.text, author: item.author, sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl, reference: item.reference, createdAt: item.createdAt.toISOString(), createdBy: 'seed' };
}
export type QuoteAssignmentsResponse = Record<QuotePlacement, string | null>;
const defaults: QuoteAssignmentsResponse = { dashboard: 'quote-5', review: 'quote-11' };

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(SystemQuote) private readonly catalog: Repository<SystemQuote>,
    @InjectRepository(QuoteAssignment) private readonly assignments: Repository<QuoteAssignment>,
    private readonly lock: UserWriteLock,
  ) {}

  async list(): Promise<QuoteResponse[]> {
    const rows = await this.catalog.find({ order: { id: 'ASC' } });
    // Natural numeric quote sequence, not lexical ('quote-10' before 'quote-2').
    return rows.sort((a,b) => Number(a.id.replace(/^quote-/,'')) - Number(b.id.replace(/^quote-/,''))).map(presentQuote);
  }

  async getAssignments(userId: string): Promise<QuoteAssignmentsResponse> {
    const rows = await this.assignments.find({ where: { userId } });
    return { ...defaults, ...Object.fromEntries(rows.map(row => [row.placement, row.quoteId])) };
  }

  setAssignments(userId: string, data: SetQuoteAssignmentsDto): Promise<QuoteAssignmentsResponse> {
    return this.lock.run(userId, async manager => {
      const entries = (['dashboard','review'] as const)
        .filter(placement => data[placement] !== undefined)
        .map(placement => ({ placement, quoteId: data[placement] ?? null }));
      const ids = [...new Set(entries.map(e => e.quoteId).filter((x): x is string => x !== null))];
      if (ids.length) {
        const available = await manager.getRepository(SystemQuote).find({ where: { id: In(ids) }, select: ['id'] });
        if (available.length !== ids.length) throw new NotFoundException('System quote not found');
      }
      const repo = manager.getRepository(QuoteAssignment);
      for (const entry of entries) {
        await repo.save(repo.create({ userId, placement: entry.placement, quoteId: entry.quoteId }));
      }
      const rows = await repo.find({ where: { userId } });
      return { ...defaults, ...Object.fromEntries(rows.map(row => [row.placement, row.quoteId])) };
    });
  }
}
