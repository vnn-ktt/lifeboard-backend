import { createHash } from 'node:crypto';
import { BUILTIN_AREA_IDS, MAX_IMPORT_BYTES, type LifeStateV1 } from './lifeboard-v1';

/** No side effects: can be used by dry-run, commit, and unit tests. */
export class SnapshotValidationError extends Error {
  constructor(readonly path: string, message: string) { super(`${path}: ${message}`); this.name = 'SnapshotValidationError'; }
}
function fail(path: string, why: string): never { throw new SnapshotValidationError(path, why); }
function obj(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected an object');
  return value as Record<string, unknown>;
}
function arr(value: unknown, path: string, limit = 3000): unknown[] {
  if (!Array.isArray(value) || value.length > limit) fail(path, `expected an array of at most ${limit} entries`);
  return value;
}
function str(value: unknown, path: string, max = 3000, min = 0): string {
  if (typeof value !== 'string' || value.length < min || value.length > max) fail(path, `expected string length ${min}..${max}`);
  if (min > 0 && value.trim().length < min) fail(path, 'blank or too short');
  return value;
}
function ident(v: unknown, path: string): string {
  const id = str(v, path, 128, 1);
  if (/\p{Cc}/u.test(id) || id.includes('|')) fail(path, 'invalid identifier');
  return id;
}
function num(v: unknown, path: string, lo: number, hi: number, integer = false): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi || (integer && !Number.isInteger(v))) fail(path, 'invalid number');
  return v;
}
function onlyKeys(record: Record<string, unknown>, path: string, fields: string[]): void {
  const allowed = new Set(fields);
  for (const key of Object.keys(record)) if (!allowed.has(key)) fail(`${path}.${key}`, 'unknown field; refusing lossy import');
}
function bool(v: unknown, path: string): boolean {
  if (typeof v !== 'boolean') fail(path, 'expected boolean');
  return v;
}
function date(v: unknown, path: string): string {
  const s = str(v, path, 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ||
    new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s) fail(path, 'invalid YYYY-MM-DD');
  return s;
}
/** Legacy seed values sometimes lack a timezone. Treat those as UTC, not server local time. */
export function instant(value: unknown, path: string): Date {
  const s = str(value, path, 40, 10);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)?$/.test(s)) fail(path, 'invalid ISO timestamp');
  date(s.slice(0,10), `${path}.date`);
  const d = new Date(/[+-]\d\d:\d\d$|Z$/.test(s) ? s : `${s}Z`);
  if (!Number.isFinite(d.valueOf())) fail(path, 'invalid timestamp');
  return d;
}
function optDate(v: unknown, path: string): void { if (v !== null && v !== undefined) date(v, path); }
function optInstant(v: unknown, path: string): void { if (v !== null && v !== undefined) instant(v, path); }
function enumeration(v: unknown, path: string, values: readonly string[]): void {
  if (typeof v !== 'string' || !values.includes(v)) fail(path, `expected one of ${values.join(', ')}`);
}
function ids(rows: unknown[], path: string): Set<string> {
  const result = new Set<string>();
  rows.forEach((v, i) => { const id = ident(obj(v, `${path}[${i}]`).id, `${path}[${i}].id`);
    if (result.has(id)) fail(`${path}[${i}].id`, 'duplicate identifier'); result.add(id); });
  return result;
}
function reference(v: unknown, set: Set<string>, path: string, nullable = false): void {
  if (nullable && (v === null || v === undefined)) return;
  if (!set.has(ident(v, path))) fail(path, 'unresolved reference');
}
function timestampPairs(row: Record<string, unknown>, path: string): void {
  optInstant(row.completedAt, `${path}.completedAt`);
}
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b));
    return `{${entries.map(([k,v])=>`${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
export function snapshotHash(snapshot: LifeStateV1): string {
  return createHash('sha256').update(stableStringify(snapshot)).digest('hex');
}

export function validateSnapshot(input: unknown): LifeStateV1 {
  const root = obj(input, 'snapshot');
  if (root.version !== 1) fail('version', 'only Lifeboard v1 supported');
  const allowed = new Set(['version','vision','goals','routines','checks','reviews','categories','focusGoalIds','goalMetricEntries',
    'goalCheckins','milestones','goalTasks','goalStatusEvents','noteGroups','notes','quotes','archivedUserQuotes','quoteAssignments']);
  for (const key of Object.keys(root)) if (!allowed.has(key)) fail(key, 'unknown backup field; refusing to silently drop data');
  str(root.vision,'vision',12000);
  const goals=arr(root.goals,'goals'), routines=arr(root.routines,'routines'), reviews=arr(root.reviews,'reviews');
  const areas=arr(root.categories??[],'categories',500);
  const metrics=arr(root.goalMetricEntries??[],'goalMetricEntries',15000);
  const checkins=arr(root.goalCheckins??[],'goalCheckins',15000);
  const milestones=arr(root.milestones??[],'milestones',15000);
  const tasks=arr(root.goalTasks??[],'goalTasks',15000);
  const events=arr(root.goalStatusEvents??[],'goalStatusEvents',15000);
  const groups=arr(root.noteGroups??[],'noteGroups',3000);
  const notes=arr(root.notes??[],'notes',3000);
  const archived=arr(root.archivedUserQuotes??[],'archivedUserQuotes',3000);
  const quoteRows=arr(root.quotes??[],'quotes',200);
  const goalIds=ids(goals,'goals'), routineIds=ids(routines,'routines'), areaIds=ids(areas,'categories');
  const metricIds=ids(metrics,'goalMetricEntries'), checkinIds=ids(checkins,'goalCheckins');
  const milestoneIds=ids(milestones,'milestones'), taskIds=ids(tasks,'goalTasks');
  ids(events,'goalStatusEvents'); const groupIds=ids(groups,'noteGroups'); ids(notes,'notes'); ids(archived,'archivedUserQuotes');
  ids(quoteRows,'quotes');
  const areaReferenceIds=new Set([...BUILTIN_AREA_IDS,...areaIds]);
  for (const [i,v] of areas.entries()) {
    const a=obj(v,`categories[${i}]`); const path=`categories[${i}]`;
    onlyKeys(a,path,['id','name','icon','accent','subtle']);
    str(a.name,`${path}.name`,35,2);str(a.icon,`${path}.icon`,60,1);
    for(const key of ['accent','subtle'])if(!/^#[a-fA-F0-9]{6}$/.test(String(a[key])))fail(`${path}.${key}`,'invalid color');
    if (BUILTIN_AREA_IDS.has(a.id as string)) fail(`${path}.id`,'built-in areas are server-managed');
  }
  const goalType=new Map<string,string>();
  for (const [i,v] of goals.entries()) {
    const g=obj(v,`goals[${i}]`), path=`goals[${i}]`, id=g.id as string;
    onlyKeys(g,path,['id','areaId','title','description','horizon','target','parentId','createdAt','startDate','dueDate','measurement','checkin','status','completedAt']);
    reference(g.areaId,areaReferenceIds,`${path}.areaId`);
    str(g.title,`${path}.title`,160,1);str(g.description,`${path}.description`,3000);
    enumeration(g.horizon,`${path}.horizon`,['month','quarter','year','five-years']); num(g.target,`${path}.target`,1,1_000_000,true);
    instant(g.createdAt,`${path}.createdAt`); reference(g.parentId,goalIds,`${path}.parentId`,true);
    if(g.parentId===id)fail(`${path}.parentId`,'self reference');
    optDate(g.startDate,`${path}.startDate`); optDate(g.dueDate,`${path}.dueDate`);
    if(g.startDate&&g.dueDate&&g.startDate>g.dueDate)fail(`${path}.dueDate`,'before startDate');
    const measurement=g.measurement===undefined?{kind:'activity'}:obj(g.measurement,`${path}.measurement`);
    const kind=measurement.kind??measurement.type;
    onlyKeys(measurement,`${path}.measurement`,kind==='numeric'?['kind','type','direction','unit','startValue','targetValue']:['kind','type']);
    enumeration(kind,`${path}.measurement.kind`,['activity','numeric','binary']);
    if(measurement.type&&measurement.kind&&measurement.type!==measurement.kind)fail(`${path}.measurement`,'conflicting kinds');
    if(kind==='numeric'){
      enumeration(measurement.direction,`${path}.measurement.direction`,['increase','decrease']);
      const start=num(measurement.startValue,`${path}.measurement.startValue`,-1e12,1e12);
      const target=num(measurement.targetValue,`${path}.measurement.targetValue`,-1e12,1e12);
      if(start===target||(measurement.direction==='increase'&&target<start)||(measurement.direction==='decrease'&&target>start))fail(`${path}.measurement`,'invalid range/direction');
      str(measurement.unit,`${path}.measurement.unit`,32);
    }
    goalType.set(id,kind as string);
    if(g.checkin!==undefined&&g.checkin!==null){
      if(kind==='activity')fail(`${path}.checkin`,'activity does not schedule check-ins');
      const c=obj(g.checkin,`${path}.checkin`);onlyKeys(c,`${path}.checkin`,['frequency','weekday','fromDate']);enumeration(c.frequency,`${path}.checkin.frequency`,['off','manual','daily','weekly']);
      date(c.fromDate,`${path}.checkin.fromDate`);
      if(c.frequency==='weekly')num(c.weekday,`${path}.checkin.weekday`,1,7,true);
      else if(c.weekday!==undefined)fail(`${path}.checkin.weekday`,'only weekly schedules have weekday');
    }
    if(g.status!==undefined)enumeration(g.status,`${path}.status`,['active','paused','completed','cancelled']);
    timestampPairs(g,path);
    if(g.status==='completed'&&g.completedAt==null)fail(`${path}.completedAt`,'required for completed status');
    if(g.status!=='completed'&&g.completedAt!=null)fail(`${path}.completedAt`,'must be null unless completed');
  }
  const goalById=new Map(goals.map(g=>[(g as {id:string}).id,g as Record<string,unknown>]));
  for (const g of goals) {const seen=new Set<string>();let cur=(g as {parentId?:string|null}).parentId;
    while(cur){if(seen.has(cur))fail('goals.parentId','parent cycle');seen.add(cur);cur=goalById.get(cur)?.parentId as string|null|undefined;}}
  for(const [i,v] of metrics.entries()){
    const m=obj(v,`goalMetricEntries[${i}]`),path=`goalMetricEntries[${i}]`;
    onlyKeys(m,path,['id','goalId','date','value','note','createdAt']);
    reference(m.goalId,goalIds,`${path}.goalId`);
    if(goalType.get(m.goalId as string)==='activity')fail(`${path}.goalId`,'activity goal cannot have metrics');
    date(m.date,`${path}.date`);num(m.value,`${path}.value`,-1e12,1e12);
    if(goalType.get(m.goalId as string)==='binary'&&m.value!==0&&m.value!==1)fail(`${path}.value`,'binary expects 0 or 1');
    if(m.note!==undefined&&m.note!==null)str(m.note,`${path}.note`,300);
    instant(m.createdAt,`${path}.createdAt`);
  }
  const completedDates=new Set<string>();
  const metricById=new Map(metrics.map(m=>[(m as {id:string}).id,m as Record<string,unknown>]));
  for(const [i,v] of checkins.entries()){
    const c=obj(v,`goalCheckins[${i}]`),path=`goalCheckins[${i}]`;
    onlyKeys(c,path,['id','goalId','dueDate','completedAt','status','metricEntryId']);
    reference(c.goalId,goalIds,`${path}.goalId`);
    if(goalType.get(c.goalId as string)==='activity')fail(`${path}.goalId`,'activity goal cannot have check-ins');
    date(c.dueDate,`${path}.dueDate`); instant(c.completedAt,`${path}.completedAt`);
    enumeration(c.status,`${path}.status`,['updated','unchanged','skipped']);
    const unique=`${c.goalId}|${c.dueDate}`;if(completedDates.has(unique))fail(path,'duplicate check-in due date');completedDates.add(unique);
    if(c.metricEntryId!=null){reference(c.metricEntryId,metricIds,`${path}.metricEntryId`);
      if(metricById.get(c.metricEntryId as string)?.goalId!==c.goalId)fail(`${path}.metricEntryId`,'metric belongs to a different goal');
      if(c.status!=='updated')fail(`${path}.metricEntryId`,'only updated can link metric');}
  }
  const milestoneGoalById=new Map<string,string>();
  for(const [i,v] of milestones.entries()){
    const m=obj(v,`milestones[${i}]`),path=`milestones[${i}]`;
    onlyKeys(m,path,['id','goalId','title','description','order','dueDate','completedAt','createdAt']);
    reference(m.goalId,goalIds,`${path}.goalId`);milestoneGoalById.set(m.id as string,m.goalId as string);
    str(m.title,`${path}.title`,90,2);str(m.description,`${path}.description`,500);
    num(m.order,`${path}.order`,0,10000,true);optDate(m.dueDate,`${path}.dueDate`);
    optInstant(m.completedAt,`${path}.completedAt`);instant(m.createdAt,`${path}.createdAt`);
  }
  for(const [i,v] of tasks.entries()){
    const t=obj(v,`goalTasks[${i}]`),path=`goalTasks[${i}]`;
    onlyKeys(t,path,['id','goalId','milestoneId','title','description','dueDate','completedAt','createdAt']);
    reference(t.goalId,goalIds,`${path}.goalId`);reference(t.milestoneId,milestoneIds,`${path}.milestoneId`,true);
    if(t.milestoneId&&milestoneGoalById.get(t.milestoneId as string)!==t.goalId)fail(`${path}.milestoneId`,'milestone belongs to another goal');
    str(t.title,`${path}.title`,90,2);str(t.description,`${path}.description`,500);
    optDate(t.dueDate,`${path}.dueDate`);optInstant(t.completedAt,`${path}.completedAt`);instant(t.createdAt,`${path}.createdAt`);
  }
  for(const [i,v] of events.entries()){
    const e=obj(v,`goalStatusEvents[${i}]`),path=`goalStatusEvents[${i}]`;
    onlyKeys(e,path,['id','goalId','status','changedAt']);
    reference(e.goalId,goalIds,`${path}.goalId`);enumeration(e.status,`${path}.status`,['active','paused','completed','cancelled']);instant(e.changedAt,`${path}.changedAt`);
  }
  for(const [i,v] of routines.entries()){
    const r=obj(v,`routines[${i}]`),path=`routines[${i}]`;
    onlyKeys(r,path,['id','goalId','title','description','time','days','durationMinutes']);
    reference(r.goalId,goalIds,`${path}.goalId`);str(r.title,`${path}.title`,160,1);str(r.description,`${path}.description`,3000);
    if(typeof r.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time))fail(`${path}.time`,'invalid HH:mm');
    const days=arr(r.days,`${path}.days`,7);if(days.length===0||new Set(days).size!==days.length)fail(`${path}.days`,'expected unique days');
    days.forEach((day,j)=>num(day,`${path}.days[${j}]`,1,7,true));num(r.durationMinutes,`${path}.durationMinutes`,1,1440,true);
  }
  const checks=obj(root.checks,'checks');if(Object.keys(checks).length>20000)fail('checks','too many checks');
  for(const [key,value] of Object.entries(checks)){
    bool(value,`checks.${key}`);
    const sep=key.indexOf('|'); if(sep!==10)fail(`checks.${key}`,'expected YYYY-MM-DD|routineId');
    date(key.slice(0,sep),`checks.${key}`);reference(key.slice(sep+1),routineIds,`checks.${key}`);
  }
  const weeks=new Set<string>();
  for(const [i,v] of reviews.entries()){
    const r=obj(v,`reviews[${i}]`),path=`reviews[${i}]`;
    onlyKeys(r,path,['weekStart','wins','obstacles','nextStep','mood','updatedAt']);
    const d=date(r.weekStart,`${path}.weekStart`);if(weeks.has(d))fail(`${path}.weekStart`,'duplicate week');weeks.add(d);
    const weekday=new Date(`${d}T00:00:00Z`).getUTCDay();if(weekday!==1)fail(`${path}.weekStart`,'must be Monday');
    for(const key of ['wins','obstacles','nextStep'])str(r[key],`${path}.${key}`,1000);
    num(r.mood,`${path}.mood`,1,10,true);instant(r.updatedAt,`${path}.updatedAt`);
  }
  const focus=arr(root.focusGoalIds??[],'focusGoalIds',3);if(new Set(focus).size!==focus.length)fail('focusGoalIds','duplicate goal');
  focus.forEach((g,i)=>reference(g,goalIds,`focusGoalIds[${i}]`));
  for(const [i,v] of groups.entries()){
    const g=obj(v,`noteGroups[${i}]`),path=`noteGroups[${i}]`;
    onlyKeys(g,path,['id','name','goalId','color','createdAt']);
    str(g.name,`${path}.name`,90,1);reference(g.goalId,goalIds,`${path}.goalId`,true);
    if(typeof g.color!=='string'||!/^#[a-fA-F0-9]{6}$/.test(g.color))fail(`${path}.color`,'invalid hex');
    instant(g.createdAt,`${path}.createdAt`);
  }
  const groupNames = new Set<string>();
  for(const g of groups){ const normalized = String((g as Record<string,unknown>).name).trim().toLocaleLowerCase();
    if(groupNames.has(normalized))fail('noteGroups','duplicate group name');groupNames.add(normalized);}
  for(const [i,v] of notes.entries()){
    const n=obj(v,`notes[${i}]`),path=`notes[${i}]`;
    onlyKeys(n,path,['id','title','content','groupId','goalId','imageDataUrl','pinned','createdAt','updatedAt']);
    str(n.title,`${path}.title`,160,1);str(n.content,`${path}.content`,20000);
    reference(n.groupId,groupIds,`${path}.groupId`,true);reference(n.goalId,goalIds,`${path}.goalId`,true);
    bool(n.pinned,`${path}.pinned`);instant(n.createdAt,`${path}.createdAt`);instant(n.updatedAt,`${path}.updatedAt`);
    if(n.imageDataUrl!==null&&n.imageDataUrl!==undefined){
      const value=str(n.imageDataUrl,`${path}.imageDataUrl`,450000,1);
      const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
      if(!match)fail(`${path}.imageDataUrl`,'unsupported or malformed image');
      const decoded = Buffer.from(match[2], 'base64');
      if(decoded.toString('base64') !== match[2] || decoded.length === 0 || decoded.length > 5 * 1024 * 1024) {
        fail(`${path}.imageDataUrl`, 'invalid base64/image bytes');
      }
      const png=decoded.length>=8&&decoded.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const jpeg=decoded.length>=3&&decoded[0]===255&&decoded[1]===216&&decoded[2]===255;
      const webp=decoded.length>=12&&decoded.toString('ascii',0,4)==='RIFF'&&decoded.toString('ascii',8,12)==='WEBP';
      if(!((match[1]==='image/png'&&png)||(match[1]==='image/jpeg'&&jpeg)||(match[1]==='image/webp'&&webp))) {
        fail(`${path}.imageDataUrl`,'image MIME and bytes do not match');
      }
    }
  }
  for(const [i,v] of quoteRows.entries()){
    const q=obj(v,`quotes[${i}]`),path=`quotes[${i}]`;
    onlyKeys(q,path,['id','text','author','sourceTitle','sourceUrl','reference','createdAt','createdBy']);
    if(q.createdBy!=='seed')fail(`${path}.createdBy`,'user-edited quotes are not supported; move to archivedUserQuotes');
    if(typeof q.id!=='string'||!/^quote-(?:[1-9]|10|11)$/.test(q.id))fail(`${path}.id`,'unknown system quote');
    str(q.sourceUrl,`${path}.sourceUrl`,1000);str(q.reference,`${path}.reference`,40);
    instant(q.createdAt,`${path}.createdAt`);
    for(const field of ['text','author','sourceTitle']){const loc=obj(q[field],`${path}.${field}`);onlyKeys(loc,`${path}.${field}`,['ru','en','de']);for(const lang of ['ru','en','de'])str(loc[lang],`${path}.${field}.${lang}`,3000);}
  }
  for(const [i,v] of archived.entries()){
    const q=obj(v,`archivedUserQuotes[${i}]`),path=`archivedUserQuotes[${i}]`;
    onlyKeys(q,path,['id','text','author','createdAt']);
    const tr=obj(q.text,`${path}.text`);onlyKeys(tr,`${path}.text`,['ru','en','de']);for(const lang of ['ru','en','de'])str(tr[lang],`${path}.text.${lang}`,5000);
    str(q.author,`${path}.author`,300);if(q.createdAt!==undefined)instant(q.createdAt,`${path}.createdAt`);
  }
  const assignments=obj(root.quoteAssignments??{},'quoteAssignments');
  for(const [placement,id] of Object.entries(assignments)){
    if(!['dashboard','review'].includes(placement))fail(`quoteAssignments.${placement}`,'invalid placement');
    if(id!==null&&id!==undefined&&!/^quote-(?:[1-9]|10|11)$/.test(String(id)))fail(`quoteAssignments.${placement}`,'unknown system quote');
  }
  return input as LifeStateV1;
}

export function validateBackupSize(raw: unknown): LifeStateV1 {
  let text: string;
  try { text = JSON.stringify(raw); } catch { fail('snapshot','not serializable'); }
  if (typeof text !== 'string') fail('snapshot','not serializable');
  if(Buffer.byteLength(text,'utf8')>MAX_IMPORT_BYTES)fail('snapshot','exceeds 5 MB JSON payload');
  return validateSnapshot(raw);
}
