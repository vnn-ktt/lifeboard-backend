import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeNote } from '@/notes/entities/life-note.entity';
import { NotesController } from '@/notes/notes.controller';
import { NotesService } from '@/notes/notes.service';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';

@Module({ imports: [TypeOrmModule.forFeature([LifeNote]), UserWriteLockModule],
  controllers: [NotesController], providers: [NotesService] })
export class NotesModule {}
