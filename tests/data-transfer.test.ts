import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validateSnapshot, validateBackupSize, snapshotHash, SnapshotValidationError, instant } from '@/data-transfer/domain/validate-snapshot';
import type { LifeStateV1 } from '@/data-transfer/domain/lifeboard-v1';

/** Based on actual v0.17.1 LifeState types and `checks[YYYY-MM-DD|routineId]`. */
function fixture(): LifeStateV1 {
  return {
    version:1, vision:'Build a healthy routine',
    categories:[],
    goals:[
      {id:'parent-goal',areaId:'career',title:'Work',description:'',horizon:'year',target:5,
        parentId:null,createdAt:'2026-11-01T00:00:00',measurement:{kind:'activity'}},
      {id:'child-goal',areaId:'finance',title:'Save money',description:'',horizon:'year',target:12,
        parentId:'parent-goal',createdAt:'2026-11-01T00:00:00',status:'paused',completedAt:null,
        measurement:{kind:'numeric',direction:'increase',unit:'EUR',startValue:0,targetValue:1000},
        checkin:{frequency:'weekly',weekday:7,fromDate:'2026-11-01'}},
    ],
    goalMetricEntries:[{id:'metric-one',goalId:'child-goal',date:'2026-11-08',value:250,
      note:'Savings',createdAt:'2026-11-08T14:00:00Z'}],
    goalCheckins:[{id:'checkin-one',goalId:'child-goal',dueDate:'2026-11-08',status:'updated',
      metricEntryId:'metric-one',completedAt:'2026-11-08T14:00:00Z'}],
    milestones:[{id:'milestone-one',goalId:'parent-goal',title:'Release MVP',description:'',order:0,
      createdAt:'2026-11-01T00:00:00Z',completedAt:null}],
    goalTasks:[{id:'task-one',goalId:'parent-goal',milestoneId:'milestone-one',title:'Deploy API',description:'',
      createdAt:'2026-11-01T00:00:00Z',completedAt:'2026-11-08T12:00:00Z'}],
    goalStatusEvents:[{id:'event-one',goalId:'child-goal',status:'paused',changedAt:'2026-11-07T12:00:00Z'}],
    routines:[{id:'routine-one',goalId:'parent-goal',title:'Write code',description:'',time:'10:00',days:[1,2,3],durationMinutes:30}],
    checks:{'2026-11-02|routine-one':true,'2026-11-03|routine-one':false},
    reviews:[{weekStart:'2026-11-02',wins:'Shipped',obstacles:'',nextStep:'Continue',mood:7,updatedAt:'2026-11-08T10:00:00Z'}],
    focusGoalIds:['parent-goal','child-goal'],
    noteGroups:[{id:'group-one',name:'Tech',goalId:'parent-goal',color:'#aabbcc',createdAt:'2026-11-01T00:00:00Z'}],
    notes:[{id:'note-one',title:'Ideas',content:'Write tests',groupId:'group-one',goalId:'parent-goal',
      imageDataUrl:null,pinned:true,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-02T00:00:00Z'}],
    archivedUserQuotes:[{id:'old-quote',text:{ru:'Привет',en:'Hello',de:'Hallo'},author:'Anonymous'}],
    quoteAssignments:{dashboard:'quote-1',review:null},
  };
}

test('valid v0.17.1 snapshot: legacy IDs, hierarchy, routines, checkins and notes',()=>{
  const data=fixture();assert.equal(validateBackupSize(data),data);
  assert.equal(snapshotHash(data),snapshotHash(JSON.parse(JSON.stringify(data))));
  const reordered=Object.fromEntries(Object.entries(data).reverse());
  assert.equal(snapshotHash(data),snapshotHash(reordered as LifeStateV1));
  assert.equal(instant('2026-11-01T00:00:00','createdAt').toISOString(),'2026-11-01T00:00:00.000Z');
});

test('old Lifeboard v1 backup without new arrays is still supported',()=>{
  const data=fixture();data.goals=data.goals.map(({measurement:_,checkin:__,status:___,completedAt:____,...rest})=>rest);
  delete data.goalMetricEntries;delete data.goalCheckins;delete data.milestones;delete data.goalTasks;delete data.goalStatusEvents;
  delete data.noteGroups;delete data.notes;delete data.categories;delete data.focusGoalIds;
  assert.equal(validateSnapshot(data),data);
});

test('rejects missing goal references and unsafe cycles',()=>{
  const data=fixture();data.goalTasks![0].milestoneId='not-present';
  assert.throws(()=>validateSnapshot(data),SnapshotValidationError);
  data.goalTasks![0].milestoneId='milestone-one';data.goals[0].parentId='child-goal';
  assert.throws(()=>validateSnapshot(data),/parent cycle/);
});

test('rejects cross-goal milestone references and mismatch of metric/checkin',()=>{
  const data=fixture();data.goalTasks![0].goalId='child-goal';
  assert.throws(()=>validateSnapshot(data),/milestone belongs to another goal/);
  data.goalTasks![0].goalId='parent-goal';data.goalCheckins![0].goalId='parent-goal';
  assert.throws(()=>validateSnapshot(data),/activity goal cannot have check-ins/);
});

test('rejects duplicate dates, malformed calendar keys and future unknown fields',()=>{
  const data=fixture();data.goalCheckins!.push({...data.goalCheckins![0],id:'second-checkin'});
  assert.throws(()=>validateSnapshot(data),/duplicate check-in/);
  data.goalCheckins!.pop();data.checks={'2026-02-30|routine-one':true};
  assert.throws(()=>validateSnapshot(data),/invalid YYYY-MM-DD/);
  data.checks={'2026-11-02|routine-one':true};(data as any).newUnrecognizedData={safe:false};
  assert.throws(()=>validateSnapshot(data),/unknown backup field/);
});

test('rejects oversized, invalid image data URLs, binary metric range',()=>{
  const data=fixture();data.notes![0].imageDataUrl='data:image/svg+xml;base64,PGRhdGE+';
  assert.throws(()=>validateSnapshot(data),/unsupported or malformed image/);
  data.notes![0].imageDataUrl='data:image/png;base64,AAAA';
  assert.throws(()=>validateSnapshot(data),/image MIME and bytes do not match/);
  data.notes![0].imageDataUrl=null;
  data.goals[1].measurement={kind:'binary'};data.goalMetricEntries![0].value=350;
  assert.throws(()=>validateSnapshot(data),/binary expects 0 or 1/);
  data.goals[1].measurement={kind:'numeric',direction:'increase',unit:'EUR',startValue:0,targetValue:1000};
  data.notes![0].content='x'.repeat(5_000_001);
  assert.throws(()=>validateBackupSize(data),/exceeds 5 MB/);
});

test('rejects dangling routine completion, unknown quote ID and completed without timestamp',()=>{
  const data=fixture();data.checks={'2026-11-08|deleted-routine':true};
  assert.throws(()=>validateSnapshot(data),/unresolved reference/);
  data.checks={};data.quoteAssignments={dashboard:'user-quote'};
  assert.throws(()=>validateSnapshot(data),/unknown system quote/);
  data.quoteAssignments={dashboard:'quote-1'};data.goals[1].status='completed';data.goals[1].completedAt=null;
  assert.throws(()=>validateSnapshot(data),/required for completed/);
});
