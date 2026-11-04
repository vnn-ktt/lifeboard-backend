import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLifeSettings } from '@/life/entities/user-life-settings.entity';

@Injectable()
export class LifeService {
  constructor(@InjectRepository(UserLifeSettings) private readonly settings: Repository<UserLifeSettings>) {}

  async getVision(userId: string): Promise<{ vision: string }> {
    const row = await this.settings.findOneBy({ userId });
    return { vision: row?.vision ?? '' };
  }

  async setVision(userId: string, vision: string): Promise<{ vision: string }> {
    await this.settings.upsert({ userId, vision }, ['userId']);
    return { vision };
  }
}
