import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { FindOperator } from 'typeorm';
import { validate } from 'class-validator';
import { CreateNoteDto } from '@/notes/dto/create-note.dto';
import { UpdateNoteDto } from '@/notes/dto/update-note.dto';
import { CreateNoteGroupDto } from '@/note-groups/dto/create-note-group.dto';
import { UpdatePreferencesDto } from '@/preferences/dto/update-preferences.dto';
import { SetQuoteAssignmentsDto } from '@/quotes/dto/set-quote-assignments.dto';
import { SetAvatarDto } from '@/users/dto/set-avatar.dto';
import { UpdateProfileDto } from '@/users/dto/update-profile.dto';
import { NotesService } from '@/notes/notes.service';
import { NoteGroupsService } from '@/note-groups/note-groups.service';
import { QuotesService } from '@/quotes/quotes.service';
import { PreferencesService } from '@/preferences/preferences.service';
import { UsersService } from '@/users/users.service';
import { LifeNote } from '@/notes/entities/life-note.entity';
import { NoteGroup } from '@/note-groups/entities/note-group.entity';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { StoredFile } from '@/files/entities/stored-file.entity';
import { QuoteAssignment } from '@/quotes/entities/quote-assignment.entity';
import { SystemQuote } from '@/quotes/entities/system-quote.entity';
import { UserPreferences } from '@/preferences/entities/user-preferences.entity';
import { User } from '@/users/entities/user.entity';

const alice = randomUUID(), bob = randomUUID(), goalId = randomUUID();
const sharedFile = randomUUID();

function matches<T extends object>(row: T, filter: Partial<T>): boolean {
  return Object.entries(filter).every(([key, value]) => {
    const actual = (row as Record<string,unknown>)[key];
    if (value instanceof FindOperator && value.type === 'in') return (value.value as unknown[]).includes(actual);
    return actual === value;
  });
}
function fakeRepo<T extends { id?: string; userId?: string }>(items: T[]) {
  return {
    create: (data: T) => data,
    findOneBy: async (filter: Partial<T>) => items.find(row => matches(row, filter)) ?? null,
    findOneByOrFail: async (filter: Partial<T>) => { const row = items.find(r => matches(r, filter)); if (!row) throw Error('Not found'); return row; },
    existsBy: async (filter: Partial<T>) => items.some(row => matches(row, filter)),
    find: async ({ where }: { where: Partial<T> }) => items.filter(row => matches(row, where)),
    save: async (data: T) => { (data as any).createdAt ??= new Date(); (data as any).updatedAt ??= new Date();
      if (!items.includes(data)) items.push(data); return data; },
    delete: async (filter: Partial<T>) => { const index = items.findIndex(row => matches(row, filter));
      if (index < 0) return { affected: 0 }; items.splice(index, 1); return { affected: 1 }; },
  };
}
function fixture() {
  const notes: LifeNote[] = [], groups: NoteGroup[] = [], assignments: QuoteAssignment[] = [], prefs: UserPreferences[] = [];
  const goals = [{ id: goalId, userId: alice }] as LifeGoal[];
  const files = [{ id: sharedFile, userId: alice, deletedAt: null }] as StoredFile[];
  const users = [{ id: alice, name: 'Alice', nickname: null, about: '', avatarFileId: null,
    email: 'alice@example.org', timezone: 'UTC', createdAt: new Date(), updatedAt: new Date() }] as User[];
  const catalog = [{ id: 'quote-1', text: { ru: 'x', en: 'x', de: 'x' }, author: { ru: 'x', en: 'x', de: 'x' },
    sourceTitle: { ru: 'x', en: 'x', de: 'x' }, sourceUrl: '', reference: '', createdAt: new Date() }] as SystemQuote[];
  const repoMap = new Map<any,any>([
    [LifeNote,fakeRepo(notes)],[NoteGroup,fakeRepo(groups)],[LifeGoal,fakeRepo(goals)],
    [StoredFile,fakeRepo(files)],[User,fakeRepo(users)],[SystemQuote,fakeRepo(catalog)],
    [QuoteAssignment,fakeRepo(assignments)],[UserPreferences,fakeRepo(prefs)],
  ]);
  const manager = { getRepository: (type: any) => repoMap.get(type) };
  const lock = { run: async (_id: string, f: (manager: any) => Promise<unknown>) => f(manager) };
  return { notes, groups, prefs, assignments, users,
    notesApi: new NotesService(repoMap.get(LifeNote), lock as any),
    groupsApi: new NoteGroupsService(repoMap.get(NoteGroup), lock as any),
    quotesApi: new QuotesService(repoMap.get(SystemQuote), repoMap.get(QuoteAssignment), lock as any),
    prefsApi: new PreferencesService(repoMap.get(UserPreferences), lock as any),
    usersApi: new UsersService(repoMap.get(User), lock as any),
  };
}

test('DTOs reject malformed URLs, image data URLs and untrusted fields', async () => {
  const invalid = plainToInstance(CreateNoteDto, { title: 'Valid', imageDataUrl: 'data:image/png;base64,AAAA',
    imageFileId: 'not-a-uuid' });
  assert.ok((await validate(invalid)).length > 0);
  assert.equal((await validate(plainToInstance(CreateNoteDto, { title: 'Valid', imageFileId: sharedFile }))).length, 0);
  assert.ok((await validate(plainToInstance(CreateNoteGroupDto, { name: 'Test', color: '#fff' }))).length > 0);
  assert.ok((await validate(plainToInstance(UpdateNoteDto, { pinned: 'true' }))).length > 0);
  assert.ok((await validate(plainToInstance(UpdatePreferencesDto, { privacy: { maskStats: 'true' } }))).length > 0);
  assert.ok((await validate(plainToInstance(SetQuoteAssignmentsDto, { dashboard: 333 }))).length > 0);
  assert.ok((await validate(plainToInstance(SetAvatarDto, { fileId: undefined }))).length > 0);
  assert.ok((await validate(plainToInstance(UpdateProfileDto, { name: ' ' }))).length > 0);
});

test('note links are owner checked, partial edit and detach behaviors', async () => {
  const f = fixture();
  const group = await f.groupsApi.create(alice, { name: 'Ideas', goalId });
  const note = await f.notesApi.create(alice, { title: 'Next steps', groupId: group.id, goalId, imageFileId: sharedFile });
  assert.equal(note.imageUrl, `/api/v1/files/${sharedFile}/content`);
  await assert.rejects(f.notesApi.get(bob, note.id), (e: any) => e.getStatus?.() === 404);
  await assert.rejects(f.notesApi.create(bob, { title: 'Forbidden', goalId }), (e: any) => e.getStatus?.() === 404);
  await assert.rejects(f.notesApi.create(alice, { title: 'Forbidden file', imageFileId: randomUUID() }),
    (e: any) => e.getStatus?.() === 404);
  await assert.rejects(f.notesApi.create(alice, { title: 'Forbidden group', groupId: randomUUID() }),
    (e: any) => e.getStatus?.() === 404);
  const patched = await f.notesApi.update(alice, note.id, { pinned: true });
  assert.equal(patched.title, 'Next steps'); assert.equal(patched.pinned, true);
  await assert.rejects(f.groupsApi.remove(bob, group.id), (e: any) => e.getStatus?.() === 404);
  await f.notesApi.remove(alice, note.id);
  assert.equal(f.notes.length, 0);
});

test('quote catalog default assignments, explicit disable, and unknown quote rejection', async () => {
  const f = fixture();
  assert.deepEqual(await f.quotesApi.getAssignments(alice), { dashboard: 'quote-5', review: 'quote-11' });
  await assert.rejects(f.quotesApi.setAssignments(alice, { dashboard: 'user-quote' }),
    (e: any) => e.getStatus?.() === 404);
  const result = await f.quotesApi.setAssignments(alice, { dashboard: 'quote-1', review: null });
  assert.deepEqual(result, { dashboard: 'quote-1', review: null });
  assert.equal((await f.quotesApi.getAssignments(bob)).dashboard, 'quote-5');
});

test('preferences are per-user and partial updates retain previous settings', async () => {
  const f = fixture();
  const result = await f.prefsApi.set(alice, { language: 'de', theme: 'dark', privacy: { maskStats: true } });
  assert.equal(result.privacy.maskStats, true);
  assert.equal(result.theme, 'dark');
  const next = await f.prefsApi.set(alice, { showHelper: false });
  assert.equal(next.language, 'de');
  assert.equal(next.privacy.maskStats, true);
  assert.equal((await f.prefsApi.get(bob)).showHelper, true);
});

test('profile forbids foreign avatar file and preserves email identity', async () => {
  const f = fixture();
  await assert.rejects(f.usersApi.setAvatar(alice, randomUUID()), (e: any) => e.getStatus?.() === 404);
  const withAvatar = await f.usersApi.setAvatar(alice, sharedFile);
  assert.equal(withAvatar.avatarFileId, sharedFile);
  const updated = await f.usersApi.updateProfile(alice, { name: 'Alice 2', nickname: 'alice' });
  assert.equal(updated.name, 'Alice 2');
  assert.equal(updated.email, 'alice@example.org');
  assert.equal((await f.usersApi.setAvatar(alice, null)).avatarFileId, null);
});
