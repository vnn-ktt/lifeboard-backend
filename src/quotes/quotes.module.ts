import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemQuote } from '@/quotes/entities/system-quote.entity';
import { QuoteAssignment } from '@/quotes/entities/quote-assignment.entity';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { QuotesController } from '@/quotes/quotes.controller';
import { QuotesService } from '@/quotes/quotes.service';

@Module({ imports: [TypeOrmModule.forFeature([SystemQuote, QuoteAssignment]), UserWriteLockModule],
  controllers: [QuotesController], providers: [QuotesService] })
export class QuotesModule {}
