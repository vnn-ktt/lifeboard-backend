import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { GoalCheckin } from '@/goal-checkins/entities/goal-checkin.entity';
import { GoalTask } from '@/tasks/entities/goal-task.entity';
import { LifeRoutine } from '@/routines/entities/life-routine.entity';
import { RoutineCheck } from '@/routines/entities/routine-check.entity';
import { LifeNote } from '@/notes/entities/life-note.entity';
import { StoredFile } from '@/files/entities/stored-file.entity';
import { ImportAudit } from '@/data-transfer/entities/import-audit.entity';
import { ArchivedUserQuote } from '@/data-transfer/entities/archived-user-quote.entity';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { DataTransferService } from '@/data-transfer/data-transfer.service';
import { StorageService } from '@/storage/storage.service';

const dbName=process.env.TEST_DB_NAME;
if(!dbName||!dbName.endsWith('_test')||dbName===process.env.DB_NAME) {
  throw new Error('TEST_DB_NAME must be a separate PostgreSQL database ending _test and not DB_NAME');
}
const base64Png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
function state(){return {
  version:1,vision:'Focus on shipping',categories:[],
  goals:[{id:'legacy-parent',areaId:'career',title:'Ship MVP',description:'',horizon:'year',target:12,createdAt:'2026-11-01T00:00:00',
    measurement:{kind:'numeric',direction:'increase',startValue:0,targetValue:100,unit:'%'} as const,
    checkin:{frequency:'weekly',weekday:7,fromDate:'2026-11-01'},status:'active'},
    {id:'legacy-child',areaId:'career',title:'Write code',description:'',horizon:'month',target:10,
      parentId:'legacy-parent',createdAt:'2026-11-01T00:00:00'}],
  goalMetricEntries:[{id:'legacy-metric',goalId:'legacy-parent',date:'2026-11-08',value:35,note:'Progress',createdAt:'2026-11-08T12:00:00Z'}],
  goalCheckins:[{id:'legacy-checkin',goalId:'legacy-parent',dueDate:'2026-11-08',completedAt:'2026-11-08T13:00:00Z',status:'updated',metricEntryId:'legacy-metric'}],
  milestones:[{id:'legacy-milestone',goalId:'legacy-parent',title:'First release',description:'',order:0,createdAt:'2026-11-01T00:00:00Z'}],
  goalTasks:[{id:'legacy-task',goalId:'legacy-parent',milestoneId:'legacy-milestone',title:'Push code',description:'',createdAt:'2026-11-01T00:00:00Z'}],
  goalStatusEvents:[],
  routines:[{id:'legacy-routine',goalId:'legacy-child',title:'Study',description:'',time:'12:00',days:[1,3,5],durationMinutes:40}],
  checks:{'2026-11-02|legacy-routine':true},
  reviews:[{weekStart:'2026-11-02',wins:'',obstacles:'',nextStep:'',mood:7,updatedAt:'2026-11-08T14:00:00Z'}],
  focusGoalIds:['legacy-parent'],
  noteGroups:[{id:'legacy-group',name:'Ideas',goalId:'legacy-parent',color:'#aabbcc',createdAt:'2026-11-01T00:00:00Z'}],
  notes:[{id:'legacy-note',title:'Plan',content:'Text',groupId:'legacy-group',goalId:'legacy-parent',
    imageDataUrl:`data:image/png;base64,${base64Png}`,pinned:true,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z'}],
  quoteAssignments:{dashboard:'quote-1'},
  archivedUserQuotes:[{id:'old-custom',text:{ru:'a',en:'a',de:'a'},author:'Me'}],
};}

test('v0.9 one-shot import: references, image bytes, isolation, idempotency, export and rollback',async()=>{
  const ds=new DataSource({type:'postgres',host:process.env.DB_HOST??'127.0.0.1',
    port:Number(process.env.DB_PORT??5432),username:process.env.DB_USER,password:process.env.DB_PASSWORD,
    database:dbName,entities:['src/**/*.entity.ts'],migrations:['src/database/migrations/*.ts'],
    migrationsTableName:'typeorm_migrations',synchronize:false});
  const alice=randomUUID(),bob=randomUUID(),charlie=randomUUID(),storage=new Map<string,Buffer>();
  const provider={put:async(key:string,b:Buffer)=>{storage.set(key,Buffer.from(b));},
    delete:async(key:string)=>{storage.delete(key);},
    get:async(key:string)=>{const body=storage.get(key);if(!body)throw Error('Not found');
      return {body:require('node:stream').Readable.from([body])};}} as unknown as StorageService;
  await ds.initialize();
  try{
    await ds.runMigrations();
    for(const id of [alice,bob,charlie])await ds.getRepository(User).insert({id,email:`${id}@example.net`,name:'Test',nickname:null,
      timezone:'UTC',about:'',avatarFileId:null,passwordHash:'not-a-real-hash'});
    const service=new DataTransferService(ds,new UserWriteLock(ds),provider);
    const snap=state();
    const preview=await service.validate(alice,snap);assert.equal(preview.canImport,true);
    const receipt=await service.import(alice,snap,'import-request-1');
    assert.equal(receipt.imported,true);assert.equal(receipt.counts.goals,2);assert.equal(receipt.counts.imageFiles,1);
    assert.notEqual(receipt.idMap.goals['legacy-parent'],'legacy-parent');
    assert.equal((await ds.getRepository(LifeGoal).findOneByOrFail({id:receipt.idMap.goals['legacy-child']})).parentId,
      receipt.idMap.goals['legacy-parent']);
    assert.equal((await ds.getRepository(GoalCheckin).findOneByOrFail({goalId:receipt.idMap.goals['legacy-parent']})).metricEntryId,
      receipt.idMap.goalMetricEntries['legacy-metric']);
    assert.equal(await ds.getRepository(GoalTask).count({where:{userId:alice}}),1);
    assert.equal(await ds.getRepository(RoutineCheck).count({where:{userId:alice}}),1);
    assert.equal(await ds.getRepository(ArchivedUserQuote).count({where:{userId:alice}}),1);
    assert.equal(storage.size,1);
    const again=await service.import(alice,snap,'import-request-1');assert.equal(again.imported,false);
    assert.equal(await ds.getRepository(GoalMetricEntry).count({where:{userId:alice}}),1);
    assert.equal(storage.size,1);
    const sameDifferentKey=await service.import(alice,snap,'import-request-2');
    assert.equal(sameDifferentKey.imported,false);
    const altered={...snap,vision:'Modified'};
    await assert.rejects(service.import(alice,altered,'import-request-1'),(e:any)=>e.getStatus?.()===409);
    await assert.rejects(service.import(alice,altered,'import-request-3'),(e:any)=>e.getStatus?.()===409);
    const exported=await service.export(alice);
    assert.equal(exported.goals.length,2);assert.equal(exported.notes?.[0].imageDataUrl?.startsWith('data:image/png;base64,'),true);
    assert.equal(exported.archivedUserQuotes?.[0].id,'old-custom');
    assert.equal(exported.focusGoalIds?.length,1);
    assert.equal((await service.export(bob)).goals.length,0);
    const second=await service.import(bob,snap,'import-request-1');assert.equal(second.imported,true);
    assert.equal(await ds.getRepository(LifeNote).count({where:{userId:bob}}),1);
    assert.equal(await ds.getRepository(ImportAudit).count(),2);
    const ownedFile=receipt.idMap.noteImages['legacy-note'];
    assert.ok((await ds.getRepository(StoredFile).findOneByOrFail({id:ownedFile,userId:alice})).storageKey);
    await assert.rejects(service.import(bob,{...snap,checks:{'2026-11-08|non-existing':true}},'bad-input'),
      (e:any)=>e.getStatus?.()===422);
    assert.equal((await ds.getRepository(LifeGoal).count({where:{userId:alice}})),2);
    // Make the second photo upload fail; PostgreSQL must roll back every row and
    // the successfully uploaded first object must be compensated in S3.
    const badStorage = {
      put: async(key:string,b:Buffer) => {
        // Only one object will be uploaded successfully.
        if (badStorage.uploaded++ > 0) throw new Error('simulated S3 outage');
        storage.set(key,Buffer.from(b));
      },
      uploaded:0,
      delete: async(key:string)=>{storage.delete(key);},
      get:provider.get,
    } as unknown as StorageService & {uploaded:number};
    const broken=state();broken.notes.push({...broken.notes[0],id:'legacy-photo-2'});
    const before=storage.size;
    const failingService=new DataTransferService(ds,new UserWriteLock(ds),badStorage);
    await assert.rejects(failingService.import(charlie,broken,'broken-import'), /simulated S3 outage/);
    assert.equal(await ds.getRepository(LifeGoal).count({where:{userId:charlie}}),0);
    assert.equal(await ds.getRepository(ImportAudit).count({where:{userId:charlie}}),0);
    assert.equal(storage.size,before);
  }finally{
    await ds.getRepository(User).delete([{id:alice},{id:bob},{id:charlie}]).catch(()=>undefined);
    await ds.destroy();
  }
});
