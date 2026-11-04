import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLifeSettings } from './entities/user-life-settings.entity';
import { LifeController } from './life.controller';
import { LifeService } from './life.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserLifeSettings])],
  providers: [LifeService],
  controllers: [LifeController],
})
export class LifeModule {}
