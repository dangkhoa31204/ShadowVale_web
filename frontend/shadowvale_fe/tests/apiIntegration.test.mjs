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
 const r=await api.authService.login({callsign:'alex',password:'test-password'});
 assert.equal(r.user.callsign,'Alex Designer');assert.equal(r.user.role,'designer');
 assert.equal(api.storageService.getSession().refreshToken,'refresh-1');// Sign-in is always tab-scoped: no 'keep me signed in' in the proposal.
 assert.equal(localStorage.getItem('shadowvale_session_v2'),null);assert.ok(sessionStorage.getItem('shadowvale_session_v2'));
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
 await api.contentApi.execute({type:'publishDraft',id:version.id,revision:s.v.revision});assert.equal(s.v.status,'Published');
 assert.equal('reason' in body(calls.find(c=>c.url.endsWith('/publish'))),false);
 await api.contentApi.execute({type:'restoreRelease',id:version.id,reason:'Restore'});
 assert.ok(calls.some(c=>c.url.endsWith('/validate')));assert.ok(calls.some(c=>c.url.endsWith('/rollback')));
});
test('analytics renders aggregate responses and sends the exact filter query',async()=>{
 const q={source:'replay',from:'2026-10-01T00:00:00Z',to:'2026-10-02T00:00:00Z',mapCode:'map_01'};
 handler=c=>ok(c,[{captureRate:0.25,encounters:4}]);
 const data=await api.analyticsApi.comparison(q,'family');assert.equal(data[0].captureRate,0.25);
 assert.equal(calls[0].params.source,'replay');assert.equal(calls[0].params.groupBy,'family');
});
test('analytics version filter reads published versions from the analytics API every role can call',async()=>{
 handler=c=>ok(c,[{id:'v3',versionNo:3,label:'Balance pass',publishedAt:'2026-10-12T00:00:00Z',isLive:true}]);
 const versions=await api.analyticsApi.contentVersions();
 assert.equal(calls[0].url,'/analytics/content-versions');assert.deepEqual(versions.map(v=>[v.versionNo,v.isLive]),[[3,true]]);
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
test('partial failures retain saved/remaining context and map nested API validation to the exact field',async()=>{
 const b=api.entitiesToEditor(version,entities()),op={resource:'items',route:'items',method:'put',code:'rifle',id:'rifle-id',data:{}};
 const c={url:'/test'},httpError=new AxiosError('Validation','ERR_BAD_RESPONSE',c,undefined,{config:c,data:{message:'Invalid item',errors:{'Weapon.Damage':['Must be positive']}},status:400,statusText:'Bad Request',headers:{}});
 try {await api.runSavePlan([op],async()=>{throw httpError;});assert.fail('Must reject');}
 catch(error){assert.match(api.errorMessage(error),/Save stopped.*Remaining: items\/rifle/);assert.deepEqual(api.editorFieldErrors(error,b),{'weapons:0:damage':'Must be positive'});}
});
test('role access starts each role on its screen and restricts solver mutations',()=>{
 for(const role of ['designer','analyst','admin'])assert.equal(api.can(role,'analytics'),true);
 assert.deepEqual(api.navigationForRole('admin').map(n=>n.path),['/admin/reviews','/admin/releases','/admin/users','/admin/analytics']);
 assert.equal(api.safeRedirect('/admin/analytics','admin'),'/admin/analytics');
 assert.equal(api.can('designer','solverEdit'),true);
 assert.equal(api.can('analyst','solverEdit'),false);
 assert.equal(api.can('admin','solverEdit'),false);
});

test('Unity import rebinds version identities and resumes a partial Draft without cloning live content or publishing',async()=>{
 const source=api.entitiesToEditor(version,entities());
 source.content_version_id='old-version';source.checksum='old-checksum';source.published_at='2026-01-01T00:00:00Z';
 source.items[0].api_id='old-row-id';source.items[0].content_version_id='old-version';
 const v={...structuredClone(version),id:'unity-import-test',versionNo:16,label:'Unity import test',revision:1};
 const rebound=api.importToVersion(source,v);
 assert.equal(rebound.content_version_id,v.id);assert.equal(rebound.version_no,16);
 assert.equal(rebound.checksum,undefined);assert.equal(rebound.items[0].api_id,undefined);
 assert.equal(rebound.items[0].content_version_id,undefined);assert.equal(source.items[0].api_id,'old-row-id');
 const data=Object.fromEntries(api.resources.map(([key])=>[key,[]]));let failRifle=true;
 handler=c=>{
  if(c.url==='/content-versions'&&c.method==='post'){
   assert.equal(body(c).parentVersionId,null);
   v.changelog=body(c).changelog;
   return ok(c,v,201);
  }
  if(c.url==='/content-versions'&&c.method==='get'){
   assert.equal(c.params.status,'Draft');
   return ok(c,{items:[v],totalPages:1});
  }
  if(c.url==='/content-versions/'+v.id)return ok(c,{version:v,bundle:api.entitiesToEditor(v,data)});
  const match=c.url.match(/\/content-versions\/unity-import-test\/([^/]+)(?:\/(.+))?/);
  const resource=match&&api.resources.find(r=>r[1]===match[1]);
  if(resource){
   const rows=data[resource[0]];
   if(c.method==='get')return ok(c,match[2]?rows.find(r=>r.id===match[2]):rows);
   if(c.method==='post'){
    const input=body(c);
    if(resource[0]==='items'&&input.code==='rifle'&&failRifle){failRifle=false;return fail(c,409,{message:'Retry fixture'});}
    const row={...input,id:resource[0]+'-'+input.code};rows.push(row);v.revision++;return ok(c,row,201);
   }
  }
  throw new Error('Unexpected request '+c.method+' '+c.url);
 };
 await assert.rejects(api.contentApi.importUnity(source,'source-hash'),e=>e.draftId===v.id&&/Saved: items\/ammo_small/.test(e.message));
 assert.deepEqual((await api.contentApi.unfinishedUnityImports(source,'source-hash','another-designer')).map(d=>d.id),[]);
 const [unfinished]=await api.contentApi.unfinishedUnityImports(source,'source-hash','designer');
 data.items[0].name='Edited after interrupted import';
 const id=await api.contentApi.importUnity(source,'source-hash',unfinished.id);
 assert.equal(data.items[0].name,'Edited after interrupted import');
 assert.equal(data.items.find(i=>i.code==='rifle').weapon.damage,24);
 assert.deepEqual(await api.contentApi.unfinishedUnityImports(source,'source-hash','designer'),[]);
 assert.ok(!calls.some(c=>c.method==='put'||c.method==='delete'));
 assert.equal(id,v.id);assert.equal(calls.filter(c=>c.method==='post'&&c.url==='/content-versions').length,1);
 assert.equal(data.items.filter(i=>i.code==='ammo_small').length,1);
 assert.ok(!calls.some(c=>/\/(validate|submit|approve|publish)$/.test(c.url)));
});

test('map rules have one authoring home and update only their owning map', () => {
 assert.equal(api.ruleTab('maps'), undefined);
 assert.equal(api.ruleTab('items').section, 'trade');
 assert.equal(api.ruleTab('loot_tables').section, 'loot');
 assert.equal(api.ruleTab('crafting_recipes').section, 'crafting');
 assert.equal(api.ruleTab('quests').section, 'missions');
 const groups = Object.fromEntries(api.contentGroups.map(group => [group[0], group]));
 assert.deepEqual(groups.maps, ['maps']);
 assert.ok(groups.loot_tables.includes('map_loot_tables'));
 assert.ok(groups.enemy_types.includes('enemy_placements'));
 const bundle = api.entitiesToEditor(version, entities());
 const first = { ...bundle.maps[0], code:'map01', layout:{ game_rules:{ difficulty:{ active_level:'hard' }, logistics:{ operationCredit:[1,2,3,4] } }, scene_metadata:true } };
 const second = { ...bundle.maps[0], code:'map02', layout:{ game_rules:{ trade_offers:[] } } };
 bundle.maps = [second, first];
 const layout = { ...first.layout, game_rules:{ ...first.layout.game_rules, logistics:{ operationCredit:[5,2,3,4] } } };
 const saved = api.updateDraftMapLayout(bundle,'map01',layout);
 assert.deepEqual(saved.maps.map(map => map.layout), [second.layout, layout]);
 assert.deepEqual(saved.maps[1].layout.game_rules.difficulty, { active_level:'hard' });
 assert.equal(saved.maps[1].layout.scene_metadata, true);
 assert.deepEqual(bundle.maps[1].layout.game_rules.logistics.operationCredit, [1,2,3,4]);
});

test('map difficulty keeps all levels and technical fields through a draft save and reload', async () => {
 const { v, data } = server();
 const current = await api.contentApi.editor(v.id);
 const before = current.bundle.maps[0];
 const normal = api.readDifficulty(before.layout);
 assert.equal(normal.active_level, 'normal');
 const levels = {
  ...normal.levels,
  easy: {guard_damage_percent:80,guard_vision_percent:90,layout_preset_id:'forest_south'},
  hard: {guard_damage_percent:120,guard_vision_percent:110,layout_preset_id:'forest_north'},
 };
 before.layout = api.withDifficulty(before.layout, {...normal, levels, active_level:'hard'});
 await api.contentApi.save(v.id, current.bundle, v.label, v.changelog);
 const after = (await api.contentApi.editor(v.id)).bundle.maps[0];
 assert.deepEqual(api.readDifficulty(after.layout), {active_level:'hard', levels});
 assert.deepEqual(after.layout.zones, ['safe']);
 assert.deepEqual(after.nav_graph, {nodes:[]});
 assert.equal(data.maps[0].sceneKey, 'Forest');
 assert.equal(api.bundledLayoutPresets.map01.length, 3);
 assert.equal(api.bundledLayoutPresets.map02.length, 3);
 assert.ok(api.bundledLayoutPresets.map01.every(preset=>preset.preview.length>0));
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

test('existing weapon keys are locked even when the child has no API GUID; stats remain editable',()=>{
 const bundle=api.entitiesToEditor(version,entities()),weapon=bundle.weapons[0];
 assert.equal(weapon.api_id,undefined);
 assert.equal(api.isExistingRecord('weapons',weapon,bundle.weapons),true);
 const fields=api.recordEditorFields('weapons',api.apiFields('weapons'),true);
 assert.equal(fields.find(f=>f.key==='item_code').readOnly,true);
 assert.equal(fields.find(f=>f.key==='ammo_item_code').readOnly,true);
 for(const key of ['damage','fire_rate','effective_range','magazine_size','reload_time_s','weapon_class']) {
  assert.equal(fields.find(f=>f.key===key).readOnly,false,key);
 }
});

test('primary, composite and foreign keys use the same locks across content tables',()=>{
 const locked={items:['code','item_type'],loot_table_entries:['loot_table_code','item_code','tier'],
  map_loot_tables:['map_code','loot_table_code','container_tag'],enemy_placements:['id','map_code','enemy_type_code'],
  crafting_recipes:['code','required_skill_code'],crafting_recipe_ingredients:['recipe_code','item_code'],
  quest_rewards:['quest_code','item_code'],enemy_types:['code','weapon_item_code']};
 for(const [collection,keys] of Object.entries(locked)) {
  const fields=api.recordEditorFields(collection,api.apiFields(collection),true);
  for(const key of keys)assert.equal(fields.find(f=>f.key===key)?.readOnly,true,collection+':'+key);
 }
 for (const [collection, key] of [['crafting_recipes', 'output_item_code'], ['enemy_types', 'loot_table_code']]) {
  assert.equal(api.recordEditorFields(collection, api.apiFields(collection), true).find(field => field.key === key)?.readOnly, false);
 }
});

test('new record keys remain selectable until saved, including nullable weapon ammo',()=>{
 const saved=[{item_code:'rifle',ammo_item_code:'ammo_small',damage:24}];
 const fresh={item_code:'new_weapon',ammo_item_code:null,damage:10};
 assert.equal(api.isExistingRecord('weapons',fresh,saved),false);
 const fields=api.recordEditorFields('weapons',api.apiFields('weapons'),false);
 assert.equal(fields.find(f=>f.key==='item_code').readOnly,false);
 assert.equal(fields.find(f=>f.key==='ammo_item_code').readOnly,false);
 assert.equal(api.isExistingRecord('weapons',fresh,[...saved,fresh]),true);
 assert.equal(api.recordEditorFields('items',api.apiFields('items'),false).find(f=>f.key==='code').readOnly,false);
});

test('designer presentation keeps every collection and preserves hidden values in the API request', () => {
  assert.equal(api.contentGroups.length, 7);
  assert.equal(new Set(api.contentGroups.flat()).size, 14);
  const data = entities();
  data.items.push({ id: 'medkit-id', code: 'medkit', name: 'Medkit', description: null, type: 'Consumable', rarity: 'Common', maxStack: 5, weight: 1, baseValue: 3, stats: {}, iconKey: null, weapon: null, updatedAt: version.updatedAt,
    consumable: { healHp: 25, restoreStamina: 7, useTimeSeconds: 2, cures: ['bleeding'], extraEffects: { duration: 4 } } });
  const bundle = api.entitiesToEditor(version, data);
  const current = bundle.consumables[0];
  const shown = api.designerFields('consumables', api.apiFields('consumables')).map(field => field.key);
  for (const field of ['restore_stamina', 'cures', 'extra_effects']) assert.ok(!shown.includes(field));
  bundle.consumables[0] = { ...current, heal_hp: 40 };
  const saved = api.editorToEntities(bundle).items.find(i => i.code === 'medkit').consumable;
  assert.deepEqual(saved, { healHp: 40, restoreStamina: 7, useTimeSeconds: 2, cures: ['bleeding'], extraEffects: { duration: 4 } });
});
test('technical settings stay out of the Designer form', () => {
  const hidden = {
    crafting_recipes: ['required_skill_code', 'required_skill_level', 'station'],
    quests: ['reward_xp', 'prerequisites', 'is_main', 'sort_order'],
    enemy_types: ['accuracy', 'fsm_params'],
  };
  for (const [collection, fields] of Object.entries(hidden)) {
    const visible = api.designerFields(collection, api.apiFields(collection)).map(field => field.key);
    for (const field of fields) assert.ok(!visible.includes(field), field);
  }
});

test('loot preview matches Unity tier fallback and ignores guarantee rows for random rolls', () => {
  const entries = [{ tier: 1, weight: 3 }, { tier: 1, weight: 1 }, { tier: 3, weight: 1 }, { tier: 5, weight: 100 }];
  assert.deepEqual(api.lootChances(entries, { game_rules: { tier_odds: [40, 10, 15, 35] } }, [100, 0, 0, 0]), [.375, .125, .5, null]);
  assert.deepEqual(api.lootChances(entries, {}, [0, 0, 0, 0]), [null, null, null, null]);
});

test('inline recipe ingredients serialize under the selected recipe and preserve other recipes', () => {
  const bundle = api.entitiesToEditor(version, entities());
  bundle.crafting_recipes = [{ code: 'first' }, { code: 'second' }];
  bundle.crafting_recipe_ingredients = [{ recipe_code: 'first', item_code: 'ammo_small', quantity: 1 }, { recipe_code: 'second', item_code: 'ammo_small', quantity: 5 }];
  const section = api.relatedSection('crafting_recipes');
  const next = api.replaceRelatedRows(bundle, section, 'first', [{ recipe_code: 'first', item_code: 'ammo_small', quantity: 3 }]);
  assert.deepEqual(api.editorToEntities(next).crafting_recipes.map(row => row.ingredients[0].quantity), [3, 5]);
  assert.equal(bundle.crafting_recipe_ingredients[0].quantity, 1);
});

test('knife saves exact attack intervals and its melee profile in a single item update', () => {
  const data = entities();
  const rifle = data.items[1];
  data.items.push({ ...rifle, id: 'knife-id', code: 'knife', name: 'Dao', stats: { melee_cooldown_s: .75, custom: 1 },
    weapon: { ...rifle.weapon, class: 'Melee', damage: 45, fireRate: 1.33, effectiveRange: 2,
      magazineSize: null, reloadTimeSeconds: null, ammoItemCode: null } });
  const bundle = api.entitiesToEditor(version, data);
  const edited = api.setKnifeAttackInterval(bundle, .86);
  const payload = api.editorToEntities(edited);
  const operations = api.planSave(api.editorToEntities(bundle), payload);
  assert.equal(operations.length, 1);
  const [op] = operations;
  assert.equal(op.code, 'knife');
  assert.deepEqual(op.data.stats, { melee_cooldown_s: .86, custom: 1 });
  assert.equal(op.data.weapon.fireRate, 1.16);
  assert.equal(op.data.weapon.ammoItemCode, null);
  const reloaded = api.entitiesToEditor(version, payload);
  assert.equal(reloaded.items.find(item => item.code === 'knife').stats.melee_cooldown_s, .86);
});

test('item stat edits retain technical data and reject reversed durability or salvage ranges', () => {
  const before = { found_min: .6, found_max: .75, melee_cooldown_s: .75, custom: { data: 1 }, salvage: [{ item: 'cloth', min: 2, max: 4 }] };
  const edited = api.patchValue(before, 'found_min', .8);
  assert.equal(api.itemStatsErrors(edited).length, 1);
  assert.equal(api.itemStatsErrors({ ...before, salvage: [{ item: 'cloth', min: 4, max: 2 }] }).length, 1);
  assert.deepEqual(api.patchValue(edited, 'found_min', null), {
    found_max: .75, melee_cooldown_s: .75, custom: { data: 1 }, salvage: [{ item: 'cloth', min: 2, max: 4 }],
  });
});

test('skill table edits keep legacy effects and validate Unity thresholds and modifiers', () => {
  const record = { code: 'shooting', skill_type: 'shooting', max_level: 5, effects: { technical: { a: true } } };
  const edited = api.updateSkillLevels(record, { xp_curve: [0, 2, 7], recoil_multipliers: [1, .98, .9653], reload_multipliers: [1, .99, .97515] }, true);
  assert.deepEqual(edited.effects.technical, { a: true });
  assert.equal(edited.max_level, 3);
  assert.deepEqual(api.skillTableErrors(edited), []);
  assert.equal(api.skillTableErrors({ ...edited, xp_curve: [0, 7, 2] }).length, 1);
  assert.equal(api.skillTableErrors({ ...edited, effects: { ...edited.effects, reload_multipliers: [1, .9, .95] } }).length, 1);
  const legacy = { ...edited, xp_curve: [0, 7, 2] };
  const saved = { items: [], skills: [legacy] };
  assert.deepEqual(api.structuredContentErrors({ ...saved, skills: [{ ...legacy, name: 'Renamed' }] }, saved), []);
});

test('a partial Unity draft recovers Map 2, all recipes and ingredients across snapshot versions', async () => {
  const catalog = JSON.parse(await fs.readFile('../../backend/shadowvale_be/ShadowVale.BLL/Catalog/unity-catalog.json', 'utf8'));
  const source = catalog.authoringBundle;
  const draft = { ...version, id: 'partial-unity', changelog: `Imported Unity source ${'a'.repeat(64)}. Review before publish.` };
  const all = api.editorToEntities(source);
  const stored = Object.fromEntries(api.resources.map(([key]) => [key, all[key].map(row => ({ ...row, id: `${key}-${row.code}` }))]));
  stored.maps = stored.maps.filter(row => row.code !== 'map02');
  stored.maps.find(row => row.code === 'map01').name = 'Designer Map 1';
  stored.crafting_recipes = [{ ...stored.crafting_recipes[0], ingredients: [] }];
  stored.quests = [];
  let mapWrites = 0;
  handler = c => {
    if (c.url === '/content-versions') {
      assert.equal(c.method, 'get');
      return ok(c, { items: [draft], totalPages: 1 });
    }
    if (c.url === `/content-versions/${draft.id}`) return ok(c, { version: draft, bundle: api.entitiesToEditor(draft, stored) });
    const [, route, id] = c.url.match(/^\/content-versions\/partial-unity\/([^/]+)(?:\/([^/]+))?$/) ?? [];
    const [key] = api.resources.find(row => row[1] === route);
    const input = body(c);
    if (c.method === 'put') {
      assert.equal(key, 'crafting_recipes');
      const recipe = stored[key].find(row => row.id === id);
      Object.assign(recipe, input);
      return ok(c, recipe);
    }
    assert.equal(c.method, 'post');
    assert.ok(!stored[key].some(row => row.code === input.code));
    const row = { ...input, id: `${key}-${input.code}` };
    stored[key].push(row);
    if (input.code === 'map02') {
      mapWrites++;
      return fail(c, 503, { message: 'Response lost after Map 2 was saved' });
    }
    return ok(c, row, 201);
  };
  const pending = await api.contentApi.unfinishedUnityImports(source, catalog.sourceHash, 'designer');
  assert.deepEqual(pending.map(row => row.id), [draft.id]);
  assert.equal(await api.contentApi.importUnity(source, catalog.sourceHash, draft.id), draft.id);
  assert.equal(mapWrites, 1);
  const saved = api.entitiesToEditor(draft, stored);
  assert.deepEqual(saved.maps.map(map => map.code), ['map00_tutorial', 'map01', 'map02']);
  assert.equal(saved.maps[1].name, 'Designer Map 1');
  assert.deepEqual(saved.maps[2].nav_graph, source.maps.find(map => map.code === 'map02').nav_graph);
  assert.deepEqual(saved.crafting_recipe_ingredients, source.crafting_recipe_ingredients);
  assert.equal(saved.crafting_recipes.length, 10);
  assert.equal(saved.quests.length, 2);
  assert.deepEqual(await api.contentApi.unfinishedUnityImports(source, catalog.sourceHash, 'designer'), []);
});
