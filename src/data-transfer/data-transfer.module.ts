import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataTransferController } from './data-transfer.controller';
import { DataTransferService } from './data-transfer.service';
import { ImportAudit } from './entities/import-audit.entity';
import { ArchivedUserQuote } from './entities/archived-user-quote.entity';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([ImportAudit, ArchivedUserQuote]), UserWriteLockModule, StorageModule],
  providers: [DataTransferService],
  controllers: [DataTransferController],
})
export class DataTransferModule {}
