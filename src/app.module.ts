import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Environment } from '@/config/environment';
import { validateEnvironment } from '@/config/environment';
import { databaseOptions } from '@/database/database-options';
import { HealthModule } from '@/health/health.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { AreasModule } from '@/areas/areas.module';
import { GoalsModule } from '@/goals/goals.module';
import { LifeModule } from '@/life/life.module';
import { RoutinesModule } from '@/routines/routines.module';
import { ProgressModule } from '@/progress/progress.module';
import { ReviewsModule } from '@/reviews/reviews.module';
import { FilesModule } from '@/files/files.module';
import { GoalMetricsModule } from '@/goal-metrics/goal-metrics.module';
import { GoalCheckinsModule } from '@/goal-checkins/goal-checkins.module';
import { GoalStatusModule } from '@/goal-status/goal-status.module';
import { MilestonesModule } from '@/milestones/milestones.module';
import { TasksModule } from '@/tasks/tasks.module';
import { NotesModule } from '@/notes/notes.module';
import { NoteGroupsModule } from '@/note-groups/note-groups.module';
import { QuotesModule } from '@/quotes/quotes.module';
import { PreferencesModule } from '@/preferences/preferences.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnvironment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...databaseOptions({
          DB_HOST: config.getOrThrow<Environment['DB_HOST']>('DB_HOST'),
          DB_PORT: config.getOrThrow<Environment['DB_PORT']>('DB_PORT'),
          DB_USER: config.getOrThrow<Environment['DB_USER']>('DB_USER'),
          DB_PASSWORD: config.getOrThrow<Environment['DB_PASSWORD']>('DB_PASSWORD'),
          DB_NAME: config.getOrThrow<Environment['DB_NAME']>('DB_NAME'),
          DB_POOL_SIZE: config.getOrThrow<Environment['DB_POOL_SIZE']>('DB_POOL_SIZE'),
          DB_SSL: config.getOrThrow<Environment['DB_SSL']>('DB_SSL'),
        }),
        autoLoadEntities: true,
        retryAttempts: 5,
        retryDelay: 1_500,
      }),
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    AreasModule,
    GoalsModule,
    LifeModule,
    RoutinesModule,
    ProgressModule,
    ReviewsModule,
    FilesModule,
    GoalMetricsModule,
    GoalCheckinsModule,
    GoalStatusModule,
    MilestonesModule,
    TasksModule,
    NotesModule,
    NoteGroupsModule,
    QuotesModule,
    PreferencesModule,
  ],
})
export class AppModule {}
