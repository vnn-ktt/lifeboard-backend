import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { StoredFile } from '@/files/entities/stored-file.entity';
import { LifeNote } from '@/notes/entities/life-note.entity';
import { NoteGroup } from '@/note-groups/entities/note-group.entity';
import { SystemQuote } from '@/quotes/entities/system-quote.entity';
import { QuoteAssignment } from '@/quotes/entities/quote-assignment.entity';
import { UserPreferences } from '@/preferences/entities/user-preferences.entity';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { NoteGroupsService } from '@/note-groups/note-groups.service';
import { NotesService } from '@/notes/notes.service';
import { QuotesService } from '@/quotes/quotes.service';
import { PreferencesService } from '@/preferences/preferences.service';
import { UsersService } from '@/users/users.service';

const dbName = process.env.TEST_DB_NAME;
if (!dbName || !dbName.endsWith('_test') || dbName === process.env.DB_NAME) {
  throw new Error('Set TEST_DB_NAME to a separate PostgreSQL database ending _test, not DB_NAME');
}

test('v0.8 migration: user ownership, system seed, FK detach, profile and preferences', async () => {
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432), username: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: dbName,
    entities: ['src/**/*.entity.ts'], migrations: ['src/database/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations', synchronize: false });
  const alice = randomUUID(), bob = randomUUID(), goalId = randomUUID(), fileId = randomUUID(), foreignFileId = randomUUID();
  await ds.initialize();
  try {
    await ds.runMigrations();
    assert.equal(await ds.getRepository(SystemQuote).count(), 11);
    for (const id of [alice, bob]) await ds.getRepository(User).insert({ id,
      email: `${id}@example.org`, name: 'Test', nickname: null, about: '', timezone: 'UTC', avatarFileId: null,
      passwordHash: 'test-not-valid-password-hash' });
    await ds.getRepository(LifeGoal).insert({ id: goalId, userId: alice, areaId: 'career',
      title: 'Ship', description: '', horizon: 'year', target: 2, parentId: null, focusPosition: null,
      status: 'active', completedAt: null, measurement: { type: 'activity' },
      startDate: null, dueDate: null, checkinFrequency: null, checkinWeekday: null, checkinFromDate: null });
    for (const [userId, id] of [[alice, fileId], [bob, foreignFileId]]) {
      await ds.getRepository(StoredFile).insert({ id, userId, storageKey: `users/${userId}/${id}.png`,
        originalName: 'test.png', mimeType: 'image/png', size: 40, deletedAt: null });
    }
    const lock = new UserWriteLock(ds);
    const groups = new NoteGroupsService(ds.getRepository(NoteGroup), lock);
    const notes = new NotesService(ds.getRepository(LifeNote), lock);
    const quotes = new QuotesService(ds.getRepository(SystemQuote), ds.getRepository(QuoteAssignment), lock);
    const prefs = new PreferencesService(ds.getRepository(UserPreferences), lock);
    const users = new UsersService(ds.getRepository(User), lock);

    const group = await groups.create(alice, { name: 'Planning', goalId, color: '#336699' });
    const note = await notes.create(alice, { title: 'Release', content: 'Deploy', goalId,
      groupId: group.id, imageFileId: fileId });
    assert.equal((await notes.list(bob)).length, 0);
    await assert.rejects(notes.create(alice, { title: 'No', imageFileId: foreignFileId }),
      (e: any) => e.getStatus?.() === 404);
    await assert.rejects(notes.update(bob, note.id, { title: 'Hack' }),
      (e: any) => e.getStatus?.() === 404);
    await assert.rejects(users.setAvatar(bob, fileId), (e: any) => e.getStatus?.() === 404);
    assert.equal((await users.setAvatar(alice, fileId)).avatarFileId, fileId);
    assert.equal((await prefs.set(alice, { theme: 'orange', privacy: { showAvatar: false } })).theme, 'orange');
    assert.equal((await prefs.get(bob)).theme, 'default');
    assert.equal((await quotes.setAssignments(alice, { dashboard: 'quote-1' })).dashboard, 'quote-1');
    assert.equal((await quotes.getAssignments(bob)).dashboard, 'quote-5');

    await groups.remove(alice, group.id);
    assert.equal((await notes.get(alice, note.id)).groupId, null);
    await ds.getRepository(LifeGoal).delete({ id: goalId, userId: alice });
    assert.equal((await notes.get(alice, note.id)).goalId, null);
    await users.setAvatar(alice, null);
    await ds.getRepository(StoredFile).delete({ id: fileId, userId: alice });
    assert.equal((await notes.get(alice, note.id)).imageFileId, null);
  } finally {
    await ds.getRepository(User).delete([{ id: alice }, { id: bob }]).catch(() => undefined);
    await ds.destroy();
  }
});
