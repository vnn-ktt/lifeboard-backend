import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreferences } from '@/preferences/entities/user-preferences.entity';
import { PreferencesService } from '@/preferences/preferences.service';
import { PreferencesController } from '@/preferences/preferences.controller';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';

@Module({ imports: [TypeOrmModule.forFeature([UserPreferences]), UserWriteLockModule],
  controllers: [PreferencesController], providers: [PreferencesService] })
export class PreferencesModule {}
