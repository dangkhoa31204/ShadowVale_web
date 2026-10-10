import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'rolldown';
import { AxiosError } from 'axios';
let api,temp,file;
class Storage {
  map = new Map();
  getItem(k){return this.map.get(k)??null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
  clear(){this.map.clear();}
}
const user={id:'designer',username:'alex',fullName:'Alex Designer',email:'alex@example.test',role:'Designer',isActive:true,lastLoginAt:null,createdAt:'2026-10-01T00:00:00Z'};
const tokens={accessToken:'valid',refreshToken:'refresh-1',accessTokenExpiresAt:'2026-10-10T01:00:00Z',refreshTokenExpiresAt:'2026-10-17T00:00:00Z',user};
const version={id:'version-1',versionNo:1,label:'Balance',changelog:'',parentVersionId:null,status:'Draft',revision:1,schemaVersion:'1.0',isValidated:false,validatedAt:null,bundleChecksum:null,validationErrors:[],authoredById:'designer',submittedAt:null,reviewedBy:null,reviewedAt:null,reviewNote:null,publishedBy:null,publishedAt:null,archivedAt:null,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',counts:null};
let calls,handler;
function ok(config,data,status=200){return {config,data:structuredClone(data),status,statusText:'OK',headers:{}};}
function fail(config,status,data){throw new AxiosError(data.message||'API error','ERR_BAD_RESPONSE',config,undefined,{config,data,status,statusText:'Error',headers:{}});}
function body(config){return typeof config.data==='string'?JSON.parse(config.data):config.data;}
before(async()=>{
  globalThis.window=new EventTarget();globalThis.localStorage=new Storage();globalThis.sessionStorage=new Storage();
  Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
  temp=await fs.mkdtemp(path.join(os.tmpdir(),'shadowvale-api-tests-'));file=path.join(temp,'api.mjs');
  await build({input:'tests/api-entry.ts',platform:'node',external:['axios'],output:{file,format:'esm'}});
  // Axios must resolve from the repository when output lives outside node_modules.
  let code=await fs.readFile(file,'utf8');
  const axiosUrl=pathToFileURL(path.resolve('node_modules/axios/index.js')).href;
  code=code.replaceAll('from "axios"','from '+JSON.stringify(axiosUrl)).replaceAll("from 'axios'",'from '+JSON.stringify(axiosUrl));
  await fs.writeFile(file,code);api=await import(pathToFileURL(file).href);
});
beforeEach(()=>{
  localStorage.clear();sessionStorage.clear();calls=[];
  handler=c=>ok(c,{});
  const adapter=async c=>{calls.push({method:c.method,url:c.url,data:body(c),params:c.params});return handler(c);};
  api.axiosClient.defaults.adapter=adapter;api.authClient.defaults.adapter=adapter;
  api.storageService.setSession({token:'valid',refreshToken:'refresh-1',remember:false,user:{id:'designer',callsign:'Alex',role:'designer',email:'alex@example.test',tier:'Internal',clearanceLevel:'designer',createdAt:'2026-10-01'}});
});
after(async()=>{if(file)await fs.unlink(file);if(temp)await fs.rmdir(temp);});
function entities(){
 const data=Object.fromEntries(api.resources.map(([key])=>[key,[]]));
 data.items=[{id:'ammo-id',code:'ammo_small',name:'Ammo',description:null,type:'Ammo',rarity:'Common',maxStack:100,weight:0.1,baseValue:1,stats:{},iconKey:null,weapon:null,consumable:null,updatedAt:version.updatedAt},
 {id:'rifle-id',code:'rifle',name:'Rifle',description:null,type:'Weapon',rarity:'Common',maxStack:1,weight:3,baseValue:100,stats:{},iconKey:null,weapon:{class:'Rifle',damage:24,fireRate:6.5,effectiveRange:40,magazineSize:30,reloadTimeSeconds:2.4,ammoItemCode:'ammo_small',maxDurability:100,durabilityPerUse:0.12,noiseRadius:18,isSuppressed:false},consumable:null,updatedAt:version.updatedAt}];
 data.maps=[{id:'map-id',code:'map_01',name:'Forest',sceneKey:'Forest',isSafeCamp:true,sortOrder:1,navGraph:{nodes:[]},layout:{zones:['safe']},enemyPlacements:[],lootTables:[],updatedAt:version.updatedAt}];
 return data;
}
function server(){
 const v=structuredClone(version),data=entities();
 handler=c=>{
  if(c.url==='/content-versions')return ok(c,{items:[v],page:1,pageSize:100,totalCount:1,totalPages:1});
  if(c.url==='/content-publications')return ok(c,{items:[],page:1,pageSize:100,totalCount:0,totalPages:0});
  if(c.url==='/content-versions/'+v.id)return ok(c,{version:v,bundle:api.entitiesToEditor(v,data)});
  const match=c.url.match(/\/content-versions\/version-1\/([^/]+)(?:\/(.+))?/);
  if(match){
   const resource=api.resources.find(r=>r[1]===match[1]),id=match[2];
   if(resource){const rows=data[resource[0]];
    if(c.method==='get')return ok(c,id?rows.find(r=>r.id===id):resource[0]==='maps'?rows.map(({enemyPlacements,lootTables,navGraph,layout,...summary})=>({...summary,enemyCount:enemyPlacements.length,lootTableCount:lootTables.length})):rows);
    if(c.method==='put'){const row=rows.find(r=>r.id===id);Object.assign(row,body(c));v.revision++;return ok(c,row);}
   }
   if(match[1]==='validate'){assert.equal(body(c).revision,v.revision);v.validatedAt=version.updatedAt;v.bundleChecksum='server-sha';v.revision++;return ok(c,{id:v.id,revision:v.revision,isValid:true,errors:[],validatedAt:v.validatedAt,bundleChecksum:v.bundleChecksum});}
   if(match[1]==='submit'){assert.equal(body(c).revision,v.revision);v.revision++;v.status='InReview';v.submittedAt=version.updatedAt;return ok(c,v);}
   if(match[1]==='approve'){assert.equal(body(c).revision,v.revision);v.revision++;v.status='Approved';return ok(c,v);}
   if(match[1]==='reject'){assert.equal(body(c).revision,v.revision);assert.equal(body(c).reviewNote,'Tune damage');v.revision++;v.status='Rejected';return ok(c,v);}
   if(match[1]==='publish'){assert.equal(body(c).revision,v.revision);v.revision++;v.status='Published';v.publishedAt=version.updatedAt;return ok(c,v);}
   if(match[1]==='rollback'){assert.equal(body(c).revision,v.revision);v.revision++;v.status='Published';return ok(c,v);}
  }
  if(c.url.endsWith('/bundle'))return ok(c,'{\n  "version_no": 1, "schema_version": "1.0", "items": [], "weapons": []\n}');
  throw Error('Unexpected request '+c.method+' '+c.url);
 };
 return {v,data};
}
test('login sends usernameOrEmail and stores complete tokens and role mapping atomically',async()=>{
 handler=c=>{assert.equal(c.url,'/auth/login');assert.deepEqual(body(c),{usernameOrEmail:'alex',password:'test-password'});return ok(c,tokens);};
 const r=await api.authService.login({callsign:'alex',password:'test-password',rememberMe:true});
 assert.equal(r.user.callsign,'Alex Designer');assert.equal(r.user.role,'designer');
 assert.equal(api.storageService.getSession().refreshToken,'refresh-1');assert.equal(sessionStorage.getItem('shadowvale_session_v2'),null);
});
test('concurrent 401s perform one refresh and replay once with the rotated token',async()=>{
 let rotations=0;
 handler=async c=>{
  if(c.url==='/auth/refresh'){rotations++;assert.equal(body(c).refreshToken,'refresh-1');await new Promise(r=>setTimeout(r,10));return ok(c,{...tokens,accessToken:'new-token',refreshToken:'refresh-2'});}
  if(c.headers.Authorization!=='Bearer new-token')return fail(c,401,{message:'expired'});
  return ok(c,{success:true});
 };
 await Promise.all(Array.from({length:12},()=>api.axiosClient.get('/auth/me')));
 assert.equal(rotations,1);assert.equal(api.storageService.getSession().refreshToken,'refresh-2');
});
test('two tab coordinators re-read storage under the same lock and do not reuse refresh tokens',async()=>{
 let current={token:'old',refreshToken:'r1'},rotations=0,queue=Promise.resolve();
 const lock=job=>{const result=queue.then(job);queue=result.catch(()=>{});return result;};
 const rotate=async()=>{rotations++;return {token:'new',refreshToken:'r2'};};
 const tab1=api.createRefreshCoordinator(()=>current,v=>current=v,rotate,lock),tab2=api.createRefreshCoordinator(()=>current,v=>current=v,rotate,lock);
 await Promise.all([tab1('old'),tab2('old')]);assert.equal(rotations,1);
});
test('copied sessionStorage tabs exchange rotated tokens under the shared lock',async()=>{
 let one={sessionId:'same-session',generation:0,token:'old',refreshToken:'r1',remember:false},two=structuredClone(one),rotations=0,queue=Promise.resolve();
 let peer1,peer2;
 peer1=api.createSessionPeers(()=>one,v=>one=v,()=>one=null,m=>queueMicrotask(()=>peer2.receive(m)));
 peer2=api.createSessionPeers(()=>two,v=>two=v,()=>two=null,m=>queueMicrotask(()=>peer1.receive(m)));
 const lock=(peer,job)=>{const result=queue.then(async()=>{await peer.synchronize();return job();});queue=result.catch(()=>{});return result;};
 const rotate=async s=>{rotations++;return {...s,token:'new',refreshToken:'r2',generation:s.generation+1};};
 const tab1=api.createRefreshCoordinator(()=>one,v=>one=v,rotate,job=>lock(peer1,job));
 const tab2=api.createRefreshCoordinator(()=>two,v=>two=v,rotate,job=>lock(peer2,job));
 await Promise.all([tab1('old'),tab2('old')]);assert.equal(rotations,1);assert.equal(two.refreshToken,'r2');
});
test('peer rotation ignores stale messages, remembered sessions and other logins',async()=>{
 let current={sessionId:'tab-session',generation:2,token:'new',refreshToken:'r2',remember:false};
 const peers=api.createSessionPeers(()=>current,v=>current=v,()=>current=null,()=>{});
 peers.receive({type:'rotated',session:{...current,generation:1,token:'stale'}});
 peers.receive({type:'rotated',session:{...current,sessionId:'other-login',generation:3,token:'other'}});
 assert.equal(current.token,'new');current.remember=true;
 peers.receive({type:'rotated',session:{...current,remember:false,generation:3,token:'copied'}});
 assert.equal(current.token,'new');
});
test('peer logout only ends tabs with the same ephemeral session identity',async()=>{
 let current={sessionId:'tab-session',generation:0,token:'t',remember:false};
 const peers=api.createSessionPeers(()=>current,v=>current=v,()=>current=null,()=>{});
 peers.receive({type:'ended',sessionId:'different-login'});assert.ok(current);
 peers.receive({type:'ended',sessionId:'tab-session'});assert.equal(current,null);
});
test('401 after retry clears auth; 403, 409 and 429 preserve session and API details',async()=>{
 for(const status of [403,409,429]){
  handler=c=>fail(c,status,{code:'failure',message:'Server constraint',errors:{Name:['Required']}});
  await assert.rejects(api.axiosClient.get('/any'),/Server constraint.*\nName: Required/);assert.ok(api.storageService.getToken());
 }
 handler=c=>c.url==='/auth/refresh'?ok(c,tokens):fail(c,401,{message:'revoked'});
 await assert.rejects(api.axiosClient.get('/any'));assert.equal(api.storageService.getToken(),null);
});
test('logout revokes the latest refresh token and clears local auth',async()=>{
 handler=c=>{assert.equal(c.url,'/auth/logout');assert.equal(body(c).refreshToken,'refresh-1');return ok(c,null,204);};
 await api.authService.logout();assert.equal(api.storageService.getToken(),null);
});
test('maps detail, nested item stats and child arrays round-trip without server-only fields',async()=>{
 const data=entities(),editor=api.entitiesToEditor(version,data),round=api.editorToEntities(editor);
 assert.equal(editor.weapons[0].weapon_class,'rifle');assert.equal(round.items[1].weapon.class,'Rifle');
 assert.equal(round.items[1].weapon.damage,24);assert.deepEqual(round.maps[0].layout,{zones:['safe']});
 assert.equal(api.planSave(round,api.editorToEntities(structuredClone(editor))).length,0);
 assert.equal(api.apiFields('weapons').find(f=>f.key==='damage').max,99999);
 const s=server();await api.contentApi.editor(version.id);assert.ok(calls.some(c=>c.url.endsWith('/maps/map-id')));assert.equal(s.v.revision,1);
});
test('saving one weapon change sends one parent PUT and no workspace placeholder',async()=>{
 const s=server(),draft=await api.contentApi.editor(version.id);calls.length=0;
 draft.bundle.weapons[0].damage=42;
 await api.contentApi.save(draft.id,draft.bundle,draft.label,draft.changelog);
 const writes=calls.filter(c=>c.method!=='get');assert.equal(writes.length,1);assert.equal(writes[0].url,'/content-versions/version-1/items/rifle-id');
 assert.equal(writes[0].data.weapon.damage,42);assert.equal(s.data.items[1].weapon.damage,42);
 assert.ok(!calls.some(c=>c.url.includes('/internal')));
});
test('partial save retries skip previously committed changes and preserve remaining edits',async()=>{
 const s=server(),draft=await api.contentApi.editor(version.id),base=handler;
 draft.bundle.items[0].name='New ammo';draft.bundle.weapons[0].damage=50;
 let failOnce=true;
 handler=c=>{if(c.method==='put'&&c.url.endsWith('/rifle-id')&&failOnce){failOnce=false;return fail(c,409,{message:'temporary conflict'});}return base(c);};
 await assert.rejects(api.contentApi.save(draft.id,draft.bundle,draft.label,draft.changelog),/Saved: items\/ammo_small.*Remaining: items\/rifle/);
 calls.length=0;await api.contentApi.save(draft.id,draft.bundle,draft.label,draft.changelog);
 assert.equal(calls.filter(c=>c.method==='put').length,1);assert.equal(s.data.items[1].weapon.damage,50);
});
test('create/delete dependency order and immutable code/type constraints',()=>{
 const before=api.editorToEntities(api.entitiesToEditor(version,entities())),after=structuredClone(before);
 after.items=after.items.map(r=>({...r,id:''}));
 const empty=Object.fromEntries(api.resources.map(([key])=>[key,[]]));
 assert.deepEqual(api.planSave(empty,after).filter(o=>o.resource==='items').map(o=>o.code),['ammo_small','rifle']);
 assert.deepEqual(api.planSave(before,empty).filter(o=>o.resource==='items').map(o=>o.code),['rifle','ammo_small']);
 const renamed=structuredClone(before);renamed.items[0].code='renamed';assert.throws(()=>api.planSave(before,renamed),/Code cannot change/);
 const changed=structuredClone(before);changed.items[1].type='Material';assert.throws(()=>api.planSave(before,changed),/Item type cannot change/);
});
test('pagination includes records after the first page',async()=>{
 const rows=await api.allPages(async page=>({items:[page],page,pageSize:1,totalPages:3,totalCount:3}));
 assert.deepEqual(rows,[1,2,3]);
});
test('submit/reject/approve/publish/rollback use backend workflow endpoints',async()=>{
 const s=server();await api.contentApi.execute({type:'submitDraft',id:version.id,revision:1});assert.equal(s.v.status,'InReview');
 await api.contentApi.execute({type:'reviewDraft',id:version.id,revision:s.v.revision,approve:false,note:'Tune damage'});assert.equal(s.v.status,'Rejected');
 s.v.status='Draft';s.v.bundleChecksum=null;await api.contentApi.execute({type:'submitDraft',id:version.id,revision:s.v.revision});
 await api.contentApi.execute({type:'reviewDraft',id:version.id,revision:s.v.revision,approve:true,note:''});
 await api.contentApi.execute({type:'publishDraft',id:version.id,revision:s.v.revision,reason:'Release'});assert.equal(s.v.status,'Published');
 await api.contentApi.execute({type:'restoreRelease',id:version.id,reason:'Restore'});
 assert.ok(calls.some(c=>c.url.endsWith('/validate')));assert.ok(calls.some(c=>c.url.endsWith('/rollback')));
});
test('runtime JSON is kept byte-for-byte rather than serializing editor model',async()=>{
 const raw='{\n  "version_no": 1, "schema_version": "1.0", "items": [], "weapons": []\n}';handler=c=>ok(c,raw);
 assert.equal(await api.contentApi.rawBundle(version.id),raw);
});
test('analytics renders aggregate responses and sends exact CSV dataset/filter queries',async()=>{
 const q={source:'replay',from:'2026-10-01T00:00:00Z',to:'2026-10-02T00:00:00Z',mapCode:'map_01'};
 handler=c=>ok(c,c.url.endsWith('/comparison')?[{captureRate:0.25,encounters:4}]:new Blob(['header\nvalue']));
 const data=await api.analyticsApi.comparison(q,'family');assert.equal(data[0].captureRate,0.25);
 await api.analyticsApi.csv('coordination-results',q);
 assert.equal(calls[0].params.source,'replay');assert.equal(calls[0].params.groupBy,'family');
 assert.equal(calls[1].url,'/analytics/export/coordination-results');
});
test('reports remain scoped local drafts and do not perform API requests',()=>{
 api.localReports.save('v1',{summary:'Designer local report'});assert.equal(api.localReports.load('v1').summary,'Designer local report');
 api.storageService.setAuth('admin',{...api.storageService.getUser(),id:'admin',role:'admin'},false);
 assert.equal(api.localReports.load('v1'),undefined);assert.equal(calls.length,0);
});
test('solver CRUD, clone and activation use dedicated endpoints and retain payloads',async()=>{
 handler=c=>ok(c,{id:'solver1',...body(c)});
 await api.analyticsApi.create({code:'genetic_v2',name:'Genetic',algorithm:'Genetic',timeBudgetMs:250,params:{population:50},quboWeights:{weight_cover:0.5}});
 await api.analyticsApi.update('solver1',{name:'Renamed',timeBudgetMs:250});
 await api.analyticsApi.clone('solver1','genetic_v3','Clone');
 await api.analyticsApi.active('solver1',true);await api.analyticsApi.remove('solver1');
 assert.deepEqual(calls.map(c=>[c.method,c.url]),[['post','/solver-configurations'],['put','/solver-configurations/solver1'],['post','/solver-configurations/solver1/clone'],['patch','/solver-configurations/solver1/active'],['delete','/solver-configurations/solver1']]);
 assert.equal(calls[0].data.params.population,50);
});

test('quest prerequisite arrays accept empty and valid codes but reject missing references',()=>{
 const b=api.entitiesToEditor(version,entities());
 b.quests=[{code:'quest_one',name:'First',description:null,objectives:[],prerequisites:[]},{code:'quest_two',name:'Second',description:null,objectives:[],prerequisites:['quest_one']}];
 assert.ok(!api.validateEditor(b).some(e=>e.includes('Prerequisites')));
 b.quests[1].prerequisites=['unknown'];
 assert.ok(api.validateEditor(b).some(e=>e.includes('missing reference unknown')));
});
test('editor JSON import rebinds GUIDs to the current version and removes foreign IDs for new codes',()=>{
 const current=api.entitiesToEditor(version,entities()),foreign=structuredClone(current);
 foreign.items[0].api_id='other-version';foreign.items.push({...foreign.items[0],code:'new_ammo',api_id:'foreign-new'});
 const rebound=api.rebindEditorImport(foreign,current);
 assert.equal(rebound.items[0].api_id,'ammo-id');assert.equal(rebound.items.at(-1).api_id,undefined);
 assert.equal(foreign.items[0].api_id,'other-version');
});
test('partial failures retain saved/remaining context and map nested API validation to the exact field',async()=>{
 const b=api.entitiesToEditor(version,entities()),op={resource:'items',route:'items',method:'put',code:'rifle',id:'rifle-id',data:{}};
 const c={url:'/test'},httpError=new AxiosError('Validation','ERR_BAD_RESPONSE',c,undefined,{config:c,data:{message:'Invalid item',errors:{'Weapon.Damage':['Must be positive']}},status:400,statusText:'Bad Request',headers:{}});
 try {await api.runSavePlan([op],async()=>{throw httpError;});assert.fail('Must reject');}
 catch(error){assert.match(api.errorMessage(error),/Save stopped.*Remaining: items\/rifle/);assert.deepEqual(api.editorFieldErrors(error,b),{'weapons:0:damage':'Must be positive'});}
});
test('role access includes Admin dashboard and restricts solver mutations and CSV',()=>{
 for(const role of ['designer','analyst','admin'])assert.equal(api.can(role,'analytics'),true);
 assert.deepEqual(api.navigationForRole('admin').map(n=>n.path),['/admin/dashboard','/admin/reviews','/admin/releases','/admin/users']);
 assert.equal(api.safeRedirect('/admin/analytics','admin'),'/admin/analytics');
 assert.equal(api.can('designer','solverEdit'),false);assert.equal(api.can('designer','analyticsExport'),false);
 assert.equal(api.can('analyst','solverEdit'),true);assert.equal(api.can('admin','analyticsExport'),true);
});

test('all nested child collections round-trip into their parent request without flat foreign columns',()=>{
 const source=entities();
 source.skills=[{id:'skill-id',code:'engineering',name:'Engineering',type:'Engineering',description:null,maxLevel:10,xpCurve:[]}];
 source.loot_tables=[{id:'loot-id',code:'forest_loot',name:'Forest loot',description:null,entries:[{itemCode:'ammo_small',dropChance:0.7,minQuantity:1,maxQuantity:8,weight:2}]}];
 source.enemy_types=[{id:'enemy-id',code:'guard',name:'Guard',health:100,moveSpeed:3,visionRange:10,visionAngleDegrees:120,hearingRange:8,weaponItemCode:'rifle',lootTableCode:'forest_loot',stats:{}}];
 source.maps[0].enemyPlacements=[{enemyTypeCode:'guard',squadTag:'alpha',posX:1,posY:2,facingDegrees:90,patrolRoute:[{x:1,y:0,z:2}],spawnCondition:{}}];
 source.maps[0].lootTables=[{lootTableCode:'forest_loot',zone:'woods',containerType:'crate'}];
 source.crafting_recipes=[{id:'recipe-id',code:'refill',name:'Refill',outputItemCode:'ammo_small',outputQuantity:10,requiredSkillCode:'engineering',requiredSkillLevel:2,craftTimeSeconds:3,ingredients:[{itemCode:'ammo_small',quantity:1}]}];
 source.quests=[{id:'quest-id',code:'scout',name:'Scout',description:null,objectives:[],prerequisites:[],rewards:[{itemCode:'ammo_small',quantity:4}]}];
 const b=api.entitiesToEditor(version,source),out=api.editorToEntities(b);
 assert.equal(out.loot_tables[0].entries[0].minQuantity,1);
 assert.equal(out.maps[0].enemyPlacements[0].posX,1);assert.equal(out.maps[0].enemyPlacements[0].posY,2);
 assert.equal(out.maps[0].enemyPlacements[0].facingDegrees,90);
 assert.equal(out.maps[0].lootTables[0].lootTableCode,'forest_loot');
 assert.equal(out.crafting_recipes[0].ingredients[0].itemCode,'ammo_small');
 assert.equal(out.quests[0].rewards[0].quantity,4);
 assert.ok(!Object.hasOwn(out.quests[0].rewards[0],'quest_code'));
});
test('failed metadata save reports already committed resources and retries metadata without replaying those resources',async()=>{
 const s=server(),draft=await api.contentApi.editor(version.id),base=handler;
 draft.bundle.weapons[0].damage=48;let failOnce=true;
 handler=c=>{if(c.method==='put'&&c.url==='/content-versions/'+version.id){if(failOnce){failOnce=false;return fail(c,400,{message:'Invalid label',errors:{Label:['Too long']}});}Object.assign(s.v,body(c));return ok(c,s.v);}return base(c);};
 await assert.rejects(api.contentApi.save(draft.id,draft.bundle,'Renamed',''),/Saved: items\/rifle.*Remaining: version metadata/);
 calls.length=0;await api.contentApi.save(draft.id,draft.bundle,'Renamed','');
 assert.deepEqual(calls.filter(c=>c.method==='put').map(c=>c.url),['/content-versions/'+version.id]);
 assert.equal(s.data.items[1].weapon.damage,48);
});
test('server revision conflicts block all writes without discarding the editor input',async()=>{
 const s=server(),draft=await api.contentApi.editor(version.id);draft.bundle.weapons[0].damage=39;s.v.revision++;calls.length=0;
 await assert.rejects(api.contentApi.save(draft.id,draft.bundle,draft.label,''),/changed on the server/);
 assert.equal(calls.filter(c=>c.method!=='get').length,0);assert.equal(draft.bundle.weapons[0].damage,39);
});

test('dev version compare reads before/after values using targetId and the new route',async()=>{
 handler=c=>{assert.equal(c.url,'/content-versions/source/compare');assert.equal(c.params.targetId,'target');return ok(c,{sourceId:'source',sourceRevision:2,targetId:'target',targetRevision:5,differences:[{path:'/weapons/["rifle"]/damage',before:25,after:42}]});};
 assert.equal((await api.contentApi.compare('source','target')).differences[0].after,42);
});
test('dev archived versions are explicitly paged and merged with active metadata',async()=>{
 const active={...version,id:'active',status:'Published'},archived={...version,id:'archived',status:'Archived'};
 handler=c=>ok(c,{items:c.params.status==='Archived'?[archived]:[active],page:1,pageSize:100,totalCount:1,totalPages:1});
 const versions=await api.contentApi.versions();assert.deepEqual(new Set(versions.map(v=>v.id)),new Set(['active','archived']));
 assert.ok(calls.some(c=>c.params.status==='Archived'));
});
test('Analyst workspace does not call restricted content metadata or publications; Designer does not call history',async()=>{
 api.storageService.setAuth('analyst',{...api.storageService.getUser(),id:'analyst',role:'analyst'},false);
 assert.equal((await api.contentApi.workspace()).drafts.length,0);assert.equal(calls.length,0);
 api.storageService.setAuth('valid',{...api.storageService.getUser(),id:'designer',role:'designer'},false);
 server();await api.contentApi.workspace();assert.ok(!calls.some(c=>c.url==='/content-publications'));
});
test('delete version sends the current revision in the DELETE body',async()=>{
 handler=c=>{assert.equal(c.url,'/content-versions/version-delete');assert.equal(c.method,'delete');assert.deepEqual(body(c),{revision:7});return ok(c,null,204);};
 await api.contentApi.deleteVersion('version-delete',7);
});

test('user directory forwards search/role/active/page to the paginated Admin API',async()=>{
 const account={...user,id:'00000000-0000-4000-8000-000000000123'};
 handler=c=>{assert.equal(c.method,'get');assert.equal(c.url,'/users');assert.deepEqual(c.params,{search:'alex',role:'Designer',isActive:false,page:2,pageSize:20});return ok(c,{items:[account],page:2,pageSize:20,totalCount:21,totalPages:2});};
 const data=await api.usersApi.list({search:'alex',role:'Designer',isActive:false,page:2});assert.equal(data.totalCount,21);assert.equal(data.items[0].username,'alex');
});
test('user create/update/reset use BE payloads; update never sends a username or password',async()=>{
 const id='00000000-0000-4000-8000-000000000123';handler=c=>ok(c,{...user,id,...body(c)});
 await api.usersApi.create({username:'team-designer',email:'designer@example.test',fullName:'Designer',role:'Designer',password:'test-only'});
 await api.usersApi.update(id,{email:'changed@example.test',fullName:null,role:'Analyst',isActive:false});
 await api.usersApi.resetPassword(id,'another-test-password');
 assert.deepEqual(calls.map(c=>[c.method,c.url]),[['post','/users'],['put','/users/'+id],['put','/users/'+id+'/password']]);
 assert.deepEqual(calls[1].data,{email:'changed@example.test',fullName:null,role:'Analyst',isActive:false});
 assert.deepEqual(calls[2].data,{newPassword:'another-test-password'});
});
test('user mutations preserve BE validation/conflict errors and never fake success',async()=>{
 handler=c=>fail(c,409,{message:'Email already registered',errors:{Email:['Choose another email.']}});
 await assert.rejects(api.usersApi.create({username:'team',email:'used@example.test',role:'Designer',password:'test-only'}),/Email already registered/);
 handler=c=>fail(c,403,{message:'Admin only'});await assert.rejects(api.usersApi.list(),/Admin only/);assert.ok(api.storageService.getToken());
});
test('display preferences recover from invalid storage and interpolate Vietnamese values',()=>{
 assert.deepEqual(api.readPreferences('broken'),{locale:'en',theme:'dark'});
 assert.deepEqual(api.readPreferences('{"locale":"vi","theme":"light"}'),{locale:'vi',theme:'light'});
 assert.deepEqual(api.readPreferences('{"locale":"unknown","theme":1}'),{locale:'en',theme:'dark'});
 assert.equal(api.formatTranslation('Trang {page} / {pages}',{page:2,pages:4}),'Trang 2 / 4');
});
