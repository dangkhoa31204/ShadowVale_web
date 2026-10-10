import { resources, type Entity, type EntitySet } from './apiModel.ts';
import type { JsonValue } from './types.ts';
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export function payload(row: Entity) { const { id,code,updatedAt,...data }=row; void id; void code; void updatedAt; return data; }
export interface SaveOperation { resource: typeof resources[number][0]; route: string; method: 'post'|'put'|'delete'; code: string; id: string; data?: Record<string,JsonValue> }
export class SaveFailure extends Error {
  readonly operation: SaveOperation;
  constructor(message: string, operation: SaveOperation, cause: unknown) {
    super(message, { cause }); this.name = 'SaveFailure'; this.operation = operation;
  }
}
function references(resource: string, row: Entity): string[] {
  const refs: string[]=[];
  const add=(group:string,value: JsonValue|undefined)=>{if(typeof value==='string' && value) refs.push(group+':'+value);};
  if(resource==='items') add('items',(row.weapon as Record<string,JsonValue>|null)?.ammoItemCode);
  if(resource==='enemy_types'){add('items',row.weaponItemCode);add('loot_tables',row.lootTableCode);}
  if(resource==='crafting_recipes'){add('items',row.outputItemCode);add('skills',row.requiredSkillCode);}
  if(resource==='quests') for(const q of (row.prerequisites as JsonValue[]||[])) add('quests',q);
  for(const key of ['entries','ingredients','rewards']) for(const child of (row[key] as Record<string,JsonValue>[]||[])) add('items',child.itemCode);
  for(const child of (row.enemyPlacements as Record<string,JsonValue>[]||[])) add('enemy_types',child.enemyTypeCode);
  for(const child of (row.lootTables as Record<string,JsonValue>[]||[])) add('loot_tables',child.lootTableCode);
  return refs;
}
export function planSave(before: EntitySet, after: EntitySet): SaveOperation[] {
  const upserts: SaveOperation[] = [], deletes: SaveOperation[]=[];
  const desired=new Map<string,Entity>(), current=new Map<string,Entity>();
  for(const [key,route] of resources) {
    for(const row of before[key]) current.set(key+':'+row.code,row);
    for(const row of after[key]) {
      const identity=key+':'+row.code;
      if(desired.has(identity)) throw new Error('Duplicate code: '+identity);
      desired.set(identity,row);
      const sameId = row.id ? before[key].find(x => x.id === row.id) : undefined;
      if (sameId && sameId.code !== row.code) throw new Error('Code cannot change after creation: '+sameId.code);
      const old=before[key].find(x=>x.code===row.code);
      if(old && row.id && row.id!==old.id) throw new Error('Resource identity changed: '+row.code);
      if(old && key==='items' && old.type!==row.type) throw new Error('Item type cannot change: '+row.code);
      if(!old || canonical(payload(old))!==canonical(payload(row))) upserts.push({resource:key,route,method:old?'put':'post',code:row.code,id:old?.id||'',data:{...payload(row),...(!old?{code:row.code}:{})}});
    }
    for(const row of before[key]) if(!after[key].some(x=>x.code===row.code)) deletes.push({resource:key,route,method:'delete',code:row.code,id:row.id});
  }
  for(const [identity,row] of desired) for(const ref of references(identity.split(':')[0],row)) if(!desired.has(ref)) throw new Error(identity+' references missing '+ref+'. Update references before saving.');
  const sorted:SaveOperation[]=[];
  const available=new Set([...current.keys()]);
  const pending=[...upserts];
  while(pending.length){
    const index=pending.findIndex(op=>references(op.resource,desired.get(op.resource+':'+op.code)!).every(r=>available.has(r)));
    if(index<0) throw new Error('New content has cyclic dependencies. Save the prerequisite records first.');
    const [op]=pending.splice(index,1);sorted.push(op);available.add(op.resource+':'+op.code);
  }
  const remaining=[...deletes];
  while(remaining.length){
    const index=remaining.findIndex(op=>!remaining.some(other=>other!==op && references(other.resource,current.get(other.resource+':'+other.code)!).includes(op.resource+':'+op.code)));
    if(index<0) throw new Error('Remove cyclic references before deleting these records.');
    sorted.push(...remaining.splice(index,1));
  }
  return sorted;
}
export async function runSavePlan(operations: SaveOperation[], send: (operation: SaveOperation)=>Promise<void>): Promise<void> {
  const saved:string[]=[];
  for(const [index,op] of operations.entries()) {
    try { await send(op); saved.push(op.resource+'/'+op.code); }
    catch(error) { throw new SaveFailure('Save stopped. Saved: '+(saved.join(', ')||'none')+'. Remaining: '+operations.slice(index).map(x=>x.resource+'/'+x.code).join(', ')+'.\n'+(error instanceof Error?error.message:'Request failed.'), op, error); }
  }
}
