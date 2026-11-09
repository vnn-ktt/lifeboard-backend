import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, PayloadTooLargeException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, In, type EntityManager } from 'typeorm';
import { LifeArea } from '@/areas/entities/life-area.entity';
import { User } from '@/users/entities/user.entity';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { GoalCheckin } from '@/goal-checkins/entities/goal-checkin.entity';
import { GoalMilestone } from '@/milestones/entities/goal-milestone.entity';
import { GoalTask } from '@/tasks/entities/goal-task.entity';
import { GoalStatusEvent } from '@/goal-status/entities/goal-status-event.entity';
import { LifeRoutine } from '@/routines/entities/life-routine.entity';
import { RoutineCheck } from '@/routines/entities/routine-check.entity';
import { WeeklyReview } from '@/reviews/entities/weekly-review.entity';
import { UserLifeSettings } from '@/life/entities/user-life-settings.entity';
import { NoteGroup } from '@/note-groups/entities/note-group.entity';
import { LifeNote } from '@/notes/entities/life-note.entity';
import { SystemQuote } from '@/quotes/entities/system-quote.entity';
import { QuoteAssignment } from '@/quotes/entities/quote-assignment.entity';
import { StoredFile } from '@/files/entities/stored-file.entity';
import { detectImageType, extensionFor, MAX_IMAGE_SIZE } from '@/files/domain/image-rules';
import { StorageService } from '@/storage/storage.service';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { ImportAudit } from './entities/import-audit.entity';
import { ArchivedUserQuote } from './entities/archived-user-quote.entity';
import {
  BUILTIN_AREA_IDS, MAX_EXPORT_BYTES,
  type LifeStateV1, type Measurement,
} from './domain/lifeboard-v1';
import { instant, snapshotHash, SnapshotValidationError, validateBackupSize } from './domain/validate-snapshot';
import { localDateKey } from '@/utils/timezone';

export interface ImportResult {
  importId: string; imported: boolean; snapshotHash: string;
  counts: Record<string, number>; idMap: Record<string, Record<string,string>>; importedAt: string;
}
export interface ImportPreview {
  valid: true; snapshotHash: string; canImport: boolean; alreadyImported: boolean;
  counts: Record<string, number>; warnings: string[];
}
function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ statusCode: 409, code, message });
}
function badBackup(error: unknown): never {
  if (error instanceof SnapshotValidationError) {
    throw new UnprocessableEntityException({ statusCode: 422, code: 'INVALID_LIFEBOARD_BACKUP',
      message: error.message, path: error.path });
  }
  throw error;
}
function normalizeSnapshot(raw: unknown): LifeStateV1 {
  try { return validateBackupSize(raw); } catch (err) { return badBackup(err); }
}
function iso(value: unknown, path: string): Date { return instant(value, path); }
function rowsOf<T>(array: readonly T[] | undefined): readonly T[] { return array ?? []; }
function countsOf(snapshot: LifeStateV1): Record<string,number> {
  return {
    categories: snapshot.categories?.length ?? 0, goals: snapshot.goals.length,
    goalMetricEntries: snapshot.goalMetricEntries?.length ?? 0, goalCheckins: snapshot.goalCheckins?.length ?? 0,
    milestones: snapshot.milestones?.length ?? 0, goalTasks: snapshot.goalTasks?.length ?? 0,
    goalStatusEvents: snapshot.goalStatusEvents?.length ?? 0, routines: snapshot.routines.length,
    checks: Object.values(snapshot.checks).filter(Boolean).length, reviews: snapshot.reviews.length,
    noteGroups: snapshot.noteGroups?.length ?? 0, notes: snapshot.notes?.length ?? 0,
    imageFiles: snapshot.notes?.filter(note => Boolean(note.imageDataUrl)).length ?? 0,
    archivedUserQuotes: snapshot.archivedUserQuotes?.length ?? 0,
  };
}
function makeMaps(state: LifeStateV1): Record<string,Record<string,string>> {
  const map: Record<string,Record<string,string>> = {};
  const collections = {
    categories: (state.categories ?? []).filter(a=>!BUILTIN_AREA_IDS.has(a.id)),
    goals: state.goals, goalMetricEntries: state.goalMetricEntries ?? [], goalCheckins: state.goalCheckins ?? [],
    milestones: state.milestones ?? [], goalTasks: state.goalTasks ?? [], goalStatusEvents: state.goalStatusEvents ?? [],
    routines: state.routines, noteGroups: state.noteGroups ?? [], notes: state.notes ?? [],
    archivedUserQuotes: state.archivedUserQuotes ?? [],
  };
  for (const [kind,rows] of Object.entries(collections)) {
    map[kind] = Object.fromEntries(rows.map(row=>[row.id, randomUUID()]));
  }
  return map;
}
function mapping(map: Record<string,Record<string,string>>, kind: string, value: string|null|undefined): string|null {
  if (value === null || value === undefined) return null;
  const mapped = map[kind]?.[value];
  if (!mapped) throw new Error(`Broken validated import mapping: ${kind}:${value}`);
  return mapped;
}
/** True when the account already contains data that an import would silently mix with or replace. */
async function hasPersonalData(manager: EntityManager, userId: string): Promise<boolean> {
  const collections = [LifeGoal, LifeRoutine, RoutineCheck, WeeklyReview, GoalMetricEntry,
    GoalCheckin, GoalMilestone, GoalTask, GoalStatusEvent, NoteGroup, LifeNote,
    QuoteAssignment, ArchivedUserQuote];
  for (const entity of collections) {
    if ((await manager.getRepository(entity).count({ where: { userId } })) > 0) return true;
  }
  if ((await manager.getRepository(LifeArea).count({ where: { userId } })) > 0) return true;
  const life = await manager.getRepository(UserLifeSettings).findOneBy({ userId });
  return Boolean(life?.vision.trim());
}
function imageBuffer(dataUrl: string): { buffer: Buffer; mimeType: 'image/jpeg'|'image/png'|'image/webp' } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new UnprocessableEntityException({statusCode:422,code:'INVALID_IMAGE',message:'Invalid embedded image'});
  const buffer = Buffer.from(match[2], 'base64');
  const type = detectImageType(buffer);
  if (!type || type !== match[1] || buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE) {
    throw new UnprocessableEntityException({statusCode:422,code:'INVALID_IMAGE',message:'Image content/mime mismatch'});
  }
  return {buffer, mimeType:type};
}

@Injectable()
export class DataTransferService {
  constructor(private readonly dataSource: DataSource, private readonly lock: UserWriteLock,
    private readonly storage: StorageService) {}

  async validate(userId: string, raw: unknown): Promise<ImportPreview> {
    const snapshot = normalizeSnapshot(raw);
    const hash = snapshotHash(snapshot);
    const previous = await this.dataSource.getRepository(ImportAudit).findOneBy({ userId, snapshotHash: hash });
    const hasData = await hasPersonalData(this.dataSource.manager, userId);
    const warnings: string[] = [];
    if (hasData && !previous) warnings.push('ACCOUNT_NOT_EMPTY: import requires an empty personal workspace; nothing was changed.');
    if (previous) warnings.push('ALREADY_IMPORTED: exact snapshot already committed; retry is a no-op.');
    if (snapshot.notes?.some(note=>note.imageDataUrl)) warnings.push('Images will be copied to private S3 storage; original browser data is not deleted.');
    if (snapshot.goals.some(g=>g.measurement && g.measurement.kind!=='activity' && !g.checkin)) {
      warnings.push('Legacy measured goals without schedules will start weekly Sunday check-ins from import day.');
    }
    return { valid: true, snapshotHash: hash, canImport: Boolean(previous || !hasData),
      alreadyImported: Boolean(previous), counts: countsOf(snapshot), warnings };
  }

  /** Full DB atomicity, with best-effort compensation of S3 uploads if the transaction rolls back. */
  async import(userId: string, raw: unknown, idempotencyKey?: string): Promise<ImportResult> {
    const snapshot = normalizeSnapshot(raw);
    const hash = snapshotHash(snapshot);
    if (idempotencyKey !== undefined && (!/^[a-zA-Z0-9_.:-]{8,128}$/.test(idempotencyKey))) {
      throw new UnprocessableEntityException({statusCode:422, code:'INVALID_IDEMPOTENCY_KEY',message:'Invalid Idempotency-Key header'});
    }
    const key = idempotencyKey ?? hash;
    const uploadedKeys: string[] = [];
    try {
      return await this.lock.run(userId, async manager => {
        const receipts = manager.getRepository(ImportAudit);
        const existingKey = await receipts.findOneBy({ userId, idempotencyKey: key });
        if (existingKey && existingKey.snapshotHash !== hash) {
          throw conflict('IDEMPOTENCY_KEY_REUSED', 'Key already used for a different snapshot');
        }
        const existing = existingKey ?? await receipts.findOneBy({ userId, snapshotHash: hash });
        if (existing) return {
          importId: existing.id, imported: false, snapshotHash: hash,
          counts: existing.counts, idMap: existing.idMap, importedAt: existing.createdAt.toISOString(),
        };
        if (await hasPersonalData(manager,userId)) {
          throw conflict('ACCOUNT_NOT_EMPTY','Import must not overwrite or merge existing personal data');
        }
        const user = await manager.getRepository(User).findOneByOrFail({ id: userId });
        const receiptId = randomUUID();
        const map = makeMaps(snapshot);
        await this.writeSnapshot(manager, userId, user.timezone, snapshot, map, receiptId, uploadedKeys);
        const receipt = await receipts.save(receipts.create({
          id: receiptId, userId, snapshotHash: hash, idempotencyKey: key, idMap: map,
          counts: countsOf(snapshot),
        }));
        return {importId:receipt.id, imported:true, snapshotHash:hash, counts:receipt.counts,
          idMap:map, importedAt:receipt.createdAt.toISOString()};
      });
    } catch(error) {
      // S3 isn't transactional. Rollback guarantees no DB rows; best-effort delete external objects.
      await Promise.allSettled(uploadedKeys.map(key=>this.storage.delete(key)));
      throw error;
    }
  }

  private async writeSnapshot(manager: EntityManager, userId: string, timezone: string,
    s: LifeStateV1, map: Record<string,Record<string,string>>, receiptId: string, uploadedKeys: string[]): Promise<void> {
    const areaMap = map.categories;
    map.noteImages = {};
    const areaRows = rowsOf(s.categories).filter(x=>!BUILTIN_AREA_IDS.has(x.id)).map(a=>({
      id:areaMap[a.id],userId,name:a.name,icon:a.icon,accent:a.accent.toLowerCase(),subtle:a.subtle.toLowerCase(),
    }));
    if(areaRows.length)await manager.getRepository(LifeArea).insert(areaRows);
    const defaultFromDate = localDateKey(timezone);
    const goalRows = s.goals.map(g=>{
      const raw = g.measurement as (Measurement&{type?:string})|undefined;
      const kind = raw?.kind ?? raw?.type ?? 'activity';
      const measurement = kind==='numeric'
        ? { type:'numeric' as const, direction:(raw as Extract<Measurement,{kind:'numeric'}>).direction,
          unit:(raw as Extract<Measurement,{kind:'numeric'}>).unit,
          startValue:(raw as Extract<Measurement,{kind:'numeric'}>).startValue,
          targetValue:(raw as Extract<Measurement,{kind:'numeric'}>).targetValue }
        : { type:kind as 'binary'|'activity' };
      const frequency = kind==='activity'?null:(g.checkin?.frequency??'weekly');
      return {
        id:map.goals[g.id],userId,areaId:BUILTIN_AREA_IDS.has(g.areaId)?g.areaId:areaMap[g.areaId],
        title:g.title,description:g.description,horizon:g.horizon,target:g.target,measurement,
        startDate:g.startDate??null,dueDate:g.dueDate??null,
        checkinFrequency:frequency,
        checkinWeekday:frequency==='weekly'?g.checkin?.weekday??7:null,
        checkinFromDate:frequency?(g.checkin?.fromDate??defaultFromDate):null,
        parentId:null as string|null,
        status:g.status??'active',completedAt:g.status==='completed'?iso(g.completedAt,`goals.${g.id}.completedAt`):null,
        focusPosition:null as number|null,createdAt:iso(g.createdAt,`goals.${g.id}.createdAt`),
      };
    });
    if(goalRows.length)await manager.getRepository(LifeGoal).insert(goalRows);
    for(const goal of s.goals)if(goal.parentId){
      await manager.getRepository(LifeGoal).update({id:map.goals[goal.id],userId},{parentId:mapping(map,'goals',goal.parentId)});
    }
    for(const [position,id] of (s.focusGoalIds??[]).entries()){
      await manager.getRepository(LifeGoal).update({id:map.goals[id],userId},{focusPosition:position});
    }
    const metrics=rowsOf(s.goalMetricEntries).map(e=>({id:map.goalMetricEntries[e.id],userId,goalId:map.goals[e.goalId],
      date:e.date,value:e.value,note:e.note??null,createdAt:iso(e.createdAt,`goalMetricEntries.${e.id}.createdAt`)}));
    if(metrics.length)await manager.getRepository(GoalMetricEntry).insert(metrics);
    const checkins=rowsOf(s.goalCheckins).map(e=>({id:map.goalCheckins[e.id],userId,goalId:map.goals[e.goalId],
      dueDate:e.dueDate,status:e.status,completedAt:iso(e.completedAt,`goalCheckins.${e.id}.completedAt`),
      metricEntryId:mapping(map,'goalMetricEntries',e.metricEntryId)}));
    if(checkins.length)await manager.getRepository(GoalCheckin).insert(checkins);
    const milestones=rowsOf(s.milestones).map(e=>({id:map.milestones[e.id],userId,goalId:map.goals[e.goalId],
      title:e.title,description:e.description,order:e.order,dueDate:e.dueDate??null,
      completedAt:e.completedAt?iso(e.completedAt,`milestones.${e.id}.completedAt`):null,
      createdAt:iso(e.createdAt,`milestones.${e.id}.createdAt`)}));
    if(milestones.length)await manager.getRepository(GoalMilestone).insert(milestones);
    const tasks=rowsOf(s.goalTasks).map(e=>({id:map.goalTasks[e.id],userId,goalId:map.goals[e.goalId],
      milestoneId:mapping(map,'milestones',e.milestoneId),title:e.title,description:e.description,dueDate:e.dueDate??null,
      completedAt:e.completedAt?iso(e.completedAt,`goalTasks.${e.id}.completedAt`):null,
      createdAt:iso(e.createdAt,`goalTasks.${e.id}.createdAt`)}));
    if(tasks.length)await manager.getRepository(GoalTask).insert(tasks);
    const events=rowsOf(s.goalStatusEvents).map(e=>({id:map.goalStatusEvents[e.id],userId,goalId:map.goals[e.goalId],
      status:e.status,changedAt:iso(e.changedAt,`goalStatusEvents.${e.id}.changedAt`)}));
    if(events.length)await manager.getRepository(GoalStatusEvent).insert(events);
    const routines=s.routines.map(e=>({id:map.routines[e.id],userId,goalId:map.goals[e.goalId],
      title:e.title,description:e.description,time:e.time,days:e.days,durationMinutes:e.durationMinutes}));
    if(routines.length)await manager.getRepository(LifeRoutine).insert(routines);
    const checks=Object.entries(s.checks).filter(([,v])=>v).map(([key])=>{
      const [date,oldId]=key.split('|');return {routineId:map.routines[oldId],userId,date};
    });
    if(checks.length)await manager.getRepository(RoutineCheck).insert(checks);
    const reviews=s.reviews.map(e=>({userId,weekStart:e.weekStart,wins:e.wins,obstacles:e.obstacles,
      nextStep:e.nextStep,mood:e.mood,updatedAt:iso(e.updatedAt,`reviews.${e.weekStart}.updatedAt`)}));
    if(reviews.length)await manager.getRepository(WeeklyReview).insert(reviews);
    await manager.getRepository(UserLifeSettings).upsert({userId,vision:s.vision},['userId']);
    const groups=rowsOf(s.noteGroups).map(e=>({id:map.noteGroups[e.id],userId,name:e.name,
      goalId:mapping(map,'goals',e.goalId),color:e.color.toLowerCase(),
      createdAt:iso(e.createdAt,`noteGroups.${e.id}.createdAt`)}));
    if(groups.length)await manager.getRepository(NoteGroup).insert(groups);
    const notes=[];
    for(const e of rowsOf(s.notes)){
      let imageFileId:string|null=null;
      if(e.imageDataUrl){
        const {buffer,mimeType}=imageBuffer(e.imageDataUrl);
        imageFileId=randomUUID();
        const storageKey=`users/${userId}/imports/${receiptId}/${imageFileId}.${extensionFor(mimeType)}`;
        await this.storage.put(storageKey,buffer,mimeType);
        uploadedKeys.push(storageKey);
        map.noteImages[e.id] = imageFileId;
        await manager.getRepository(StoredFile).insert({id:imageFileId,userId,storageKey,
          originalName:`imported-${imageFileId}.${extensionFor(mimeType)}`,mimeType,size:buffer.byteLength});
      }
      notes.push({id:map.notes[e.id],userId,title:e.title,content:e.content,pinned:e.pinned,
        goalId:mapping(map,'goals',e.goalId),groupId:mapping(map,'noteGroups',e.groupId),imageFileId,
        createdAt:iso(e.createdAt,`notes.${e.id}.createdAt`),updatedAt:iso(e.updatedAt,`notes.${e.id}.updatedAt`)});
    }
    if(notes.length)await manager.getRepository(LifeNote).insert(notes);
    const assignments=Object.entries(s.quoteAssignments??{}).filter(([key])=>key==='dashboard'||key==='review');
    if(assignments.length)await manager.getRepository(QuoteAssignment).insert(assignments.map(([placement,quoteId])=>({
      userId, placement:placement as 'dashboard'|'review',quoteId:quoteId??null,
    })));
    const archived=rowsOf(s.archivedUserQuotes).map(q=>({id:map.archivedUserQuotes[q.id],userId,payload:q}));
    if(archived.length)await manager.getRepository(ArchivedUserQuote).insert(archived);
  }

  /** Creates frontend-compatible JSON. Preserves photo bytes instead of emitting broken S3 URLs. */
  async export(userId: string): Promise<LifeStateV1> {
    // A single PostgreSQL snapshot avoids mixing rows from concurrent user writes.
    return this.dataSource.transaction('REPEATABLE READ', async (repo) => {
      await repo.getRepository(User).createQueryBuilder('account')
        .setLock('pessimistic_read')
        .where('account.id = :userId', {userId}).getOneOrFail();
    const [areas,goals,metrics,checkins,milestones,tasks,events,routines,checks,reviews,groups,notes,
      quotes,assignments,life,archives] = await Promise.all([
      repo.getRepository(LifeArea).find({where:{userId},order:{createdAt:'ASC'}}),
      repo.getRepository(LifeGoal).find({where:{userId},order:{createdAt:'ASC',id:'ASC'}}),
      repo.getRepository(GoalMetricEntry).find({where:{userId},order:{date:'ASC',createdAt:'ASC'}}),
      repo.getRepository(GoalCheckin).find({where:{userId},order:{dueDate:'ASC'}}),
      repo.getRepository(GoalMilestone).find({where:{userId},order:{order:'ASC',createdAt:'ASC'}}),
      repo.getRepository(GoalTask).find({where:{userId},order:{createdAt:'ASC'}}),
      repo.getRepository(GoalStatusEvent).find({where:{userId},order:{changedAt:'ASC'}}),
      repo.getRepository(LifeRoutine).find({where:{userId},order:{createdAt:'ASC'}}),
      repo.getRepository(RoutineCheck).find({where:{userId},order:{date:'ASC'}}),
      repo.getRepository(WeeklyReview).find({where:{userId},order:{weekStart:'ASC'}}),
      repo.getRepository(NoteGroup).find({where:{userId},order:{createdAt:'ASC'}}),
      repo.getRepository(LifeNote).find({where:{userId},order:{createdAt:'ASC'}}),
      repo.getRepository(SystemQuote).find({order:{id:'ASC'}}),
      repo.getRepository(QuoteAssignment).find({where:{userId}}),
      repo.getRepository(UserLifeSettings).findOneBy({userId}),
      repo.getRepository(ArchivedUserQuote).find({where:{userId}}),
    ]);
    const imageIds=[...new Set(notes.map(x=>x.imageFileId).filter((x):x is string=>Boolean(x)))];
    const fileRows=imageIds.length?await repo.getRepository(StoredFile).find({where:{userId,id:In(imageIds)}}):[];
    const files=new Map(fileRows.map(x=>[x.id,x]));
    if(imageIds.some(id=>!files.has(id)))throw new ServiceUnavailableException('A referenced image is unavailable; refusing incomplete export');
    const dataUrls=new Map<string,string>();
    let imageBytes=0;
    for(const file of fileRows){
      const stored=await this.storage.get(file.storageKey);
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of stored.body){
        const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
        size+=buffer.byteLength;
        if(size>MAX_IMAGE_SIZE||imageBytes+size>MAX_EXPORT_BYTES){stored.body.destroy();throw new PayloadTooLargeException('Export contains too many image bytes');}
        chunks.push(buffer);
      }
      const combined=Buffer.concat(chunks);
      if(detectImageType(combined)!==file.mimeType){throw new ServiceUnavailableException('Stored image content/type mismatch');}
      imageBytes+=combined.byteLength;
      dataUrls.set(file.id,`data:${file.mimeType};base64,${combined.toString('base64')}`);
    }
    const backup:LifeStateV1={
      version:1,vision:life?.vision??'',
      categories:areas.map(a=>({id:a.id,name:a.name,icon:a.icon,accent:a.accent,subtle:a.subtle})),
      goals:goals.map(g=>({
        id:g.id,areaId:g.areaId,title:g.title,description:g.description,horizon:g.horizon,target:g.target,
        parentId:g.parentId,createdAt:g.createdAt.toISOString(),
        ...(g.startDate?{startDate:g.startDate}:{}),...(g.dueDate?{dueDate:g.dueDate}:{}),
        measurement:g.measurement.type==='numeric'
          ? {kind:'numeric',direction:g.measurement.direction,startValue:g.measurement.startValue,
            targetValue:g.measurement.targetValue,unit:g.measurement.unit}
          : {kind:g.measurement.type},
        ...(g.checkinFrequency&&g.checkinFromDate?{checkin:{frequency:g.checkinFrequency,
          ...(g.checkinWeekday?{weekday:g.checkinWeekday}:{}),fromDate:g.checkinFromDate}}:{}),
        status:g.status,completedAt:g.completedAt?.toISOString()??null,
      })),
      goalMetricEntries:metrics.map(x=>({id:x.id,goalId:x.goalId,date:x.date,value:x.value,note:x.note??'',createdAt:x.createdAt.toISOString()})),
      goalCheckins:checkins.map(x=>({id:x.id,goalId:x.goalId,dueDate:x.dueDate,completedAt:x.completedAt.toISOString(),status:x.status,
        ...(x.metricEntryId?{metricEntryId:x.metricEntryId}:{})})),
      milestones:milestones.map(x=>({id:x.id,goalId:x.goalId,title:x.title,description:x.description,order:x.order,
        ...(x.dueDate?{dueDate:x.dueDate}:{}),completedAt:x.completedAt?.toISOString()??null,createdAt:x.createdAt.toISOString()})),
      goalTasks:tasks.map(x=>({id:x.id,goalId:x.goalId,milestoneId:x.milestoneId,title:x.title,description:x.description,
        ...(x.dueDate?{dueDate:x.dueDate}:{}),completedAt:x.completedAt?.toISOString()??null,createdAt:x.createdAt.toISOString()})),
      goalStatusEvents:events.map(x=>({id:x.id,goalId:x.goalId,status:x.status,changedAt:x.changedAt.toISOString()})),
      routines:routines.map(x=>({id:x.id,goalId:x.goalId,title:x.title,description:x.description,time:x.time,
        days:x.days,durationMinutes:x.durationMinutes})),
      checks:Object.fromEntries(checks.map(x=>[`${x.date}|${x.routineId}`,true])),
      reviews:reviews.map(x=>({weekStart:x.weekStart,wins:x.wins,obstacles:x.obstacles,nextStep:x.nextStep,
        mood:x.mood,updatedAt:x.updatedAt.toISOString()})),
      focusGoalIds:goals.filter(x=>x.focusPosition!==null).sort((a,b)=>(a.focusPosition??0)-(b.focusPosition??0)).map(x=>x.id),
      noteGroups:groups.map(x=>({id:x.id,name:x.name,goalId:x.goalId,color:x.color,createdAt:x.createdAt.toISOString()})),
      notes:notes.map(x=>({id:x.id,title:x.title,content:x.content,groupId:x.groupId,goalId:x.goalId,
        imageDataUrl:x.imageFileId?dataUrls.get(x.imageFileId)??null:null,pinned:x.pinned,
        createdAt:x.createdAt.toISOString(),updatedAt:x.updatedAt.toISOString()})),
      quotes:quotes.sort((a,b)=>Number(a.id.replace(/^quote-/,''))-Number(b.id.replace(/^quote-/,''))).map(x=>({id:x.id,text:x.text,author:x.author,sourceTitle:x.sourceTitle,
        sourceUrl:x.sourceUrl,reference:x.reference,createdAt:x.createdAt.toISOString(),createdBy:'seed'})),
      quoteAssignments:{dashboard:'quote-5',review:'quote-11',...Object.fromEntries(assignments.map(x=>[x.placement,x.quoteId]))},
      archivedUserQuotes:archives.map(x=>x.payload),
    };
    const byteLength=Buffer.byteLength(JSON.stringify(backup),'utf8');
    if(byteLength>MAX_EXPORT_BYTES)throw new PayloadTooLargeException('Export exceeds 32 MB; download attachments separately');
    return backup;
    });
  }
}
