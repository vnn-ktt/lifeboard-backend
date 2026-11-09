import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteGroup } from '@/note-groups/entities/note-group.entity';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { NoteGroupsController } from '@/note-groups/note-groups.controller';
import { NoteGroupsService } from '@/note-groups/note-groups.service';

@Module({ imports: [TypeOrmModule.forFeature([NoteGroup]), UserWriteLockModule],
  controllers: [NoteGroupsController], providers: [NoteGroupsService], exports: [NoteGroupsService] })
export class NoteGroupsModule {}
