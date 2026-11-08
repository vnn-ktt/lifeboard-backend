import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { UserPreferences } from '@/preferences/entities/user-preferences.entity';
import type { UpdatePreferencesDto } from '@/preferences/dto/update-preferences.dto';

export function presentPreferences(row: Pick<UserPreferences,
  'theme' | 'language' | 'goalEntryMode' | 'showHelper' | 'showAvatar' | 'maskStats'>) {
  return { theme: row.theme, language: row.language, goalEntryMode: row.goalEntryMode,
    showHelper: row.showHelper, privacy: { showAvatar: row.showAvatar, maskStats: row.maskStats } };
}

@Injectable()
export class PreferencesService {
  constructor(@InjectRepository(UserPreferences) private readonly prefs: Repository<UserPreferences>,
    private readonly lock: UserWriteLock) {}

  async get(userId: string) {
    const row = await this.prefs.findOneBy({ userId });
    return presentPreferences(row ?? { theme: 'default', language: 'ru', goalEntryMode: 'wizard',
      showHelper: true, showAvatar: true, maskStats: false });
  }

  /** PUT merges declared keys, retaining previously stored values for omitted keys. */
  set(userId: string, input: UpdatePreferencesDto) {
    return this.lock.run(userId, async manager => {
      const repo = manager.getRepository(UserPreferences);
      const existing = await repo.findOneBy({ userId });
      const row = existing ?? repo.create({ userId, theme: 'default', language: 'ru',
        goalEntryMode: 'wizard', showHelper: true, showAvatar: true, maskStats: false });
      if (input.theme !== undefined) row.theme = input.theme;
      if (input.language !== undefined) row.language = input.language;
      if (input.goalEntryMode !== undefined) row.goalEntryMode = input.goalEntryMode;
      if (input.showHelper !== undefined) row.showHelper = input.showHelper;
      if (input.privacy?.showAvatar !== undefined) row.showAvatar = input.privacy.showAvatar;
      if (input.privacy?.maskStats !== undefined) row.maskStats = input.privacy.maskStats;
      const saved = await repo.save(row);
      return presentPreferences(saved);
    });
  }
}
