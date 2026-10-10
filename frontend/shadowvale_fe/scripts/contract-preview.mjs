// Isolated UI QA only: mock API on 15079, Vite on 15173. Never touches the BE/database.
import http from 'node:http';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { build } from 'rolldown';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
await fs.mkdir('node_modules/.tmp',{recursive:true});
const out=path.resolve('node_modules/.tmp/shadowvale-contract-qa.mjs');
await build({input:'tests/api-entry.ts',platform:'node',external:['axios'],output:{file:out,format:'esm'}});
const api=await import(pathToFileURL(out).href);
const seed=JSON.parse(await fs.readFile('src/features/content/contracts/demo-bundle.json','utf8'));
const now=new Date().toISOString();
const users=Object.fromEntries(['Designer','Admin','Analyst'].map(role=>[role.toLowerCase(),{id:role.toLowerCase(),username:role.toLowerCase(),email:role.toLowerCase()+'@example.test',fullName:'Fixture '+role,role,isActive:true,lastLoginAt:now,createdAt:now}]));
const versions=[1,2,3].map(n=>({id:'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),versionNo:n,label:['Initial release','Balance draft','Map 01 review'][n-1],changelog:'Isolated contract UI fixture.',parentVersionId:n===1?null:'00000000-0000-4000-8000-000000000001',status:['Published','Draft','InReview'][n-1],revision:1,schemaVersion:'1.0',isValidated:n!==2,validatedAt:n===2?null:now,bundleChecksum:n===2?null:'a'.repeat(64),validationErrors:[],authoredById:'designer',submittedAt:n===3?now:null,reviewedById:null,reviewedAt:null,reviewNote:null,publishedById:n===1?'admin':null,publishedAt:n===1?now:null,archivedAt:null,createdAt:now,updatedAt:now,counts:null}));
const entities=new Map(versions.map(v=>{
 const rows=api.editorToEntities({...seed,weapons:seed.weapons.map((r,i)=>({...r,damage:i===0?24+v.versionNo:r.damage}))});
 for(const [group]of api.resources) for(const row of rows[group])row.id=randomUUID();
 return [v.id,rows];
}));
const enumData={itemTypes:['Weapon','Ammo','Consumable','Material','Tool','Armor','QuestItem'],itemRarities:['Common','Uncommon','Rare','Epic','Legendary'],weaponClasses:['Pistol','Smg','Rifle','Shotgun','Sniper','Melee'],skillTypes:['Shooting','Engineering','Stealth'],contentStatuses:['Draft','InReview','Rejected','Approved','Published','Archived'],solverAlgorithms:['Greedy','Genetic','ClassicalSa','Qaoa','Sqa','Qiea','QpuDwave'],solverFamilies:['Classical','QuantumInspired','QuantumHardware'],sessionSources:['human','replay'],sessionOutcomes:['InProgress','Completed','Died','Quit','Crashed'],encounterOutcomes:['Captured','Escaped','Aborted']};
let solvers=[{id:randomUUID(),code:'greedy',name:'Greedy baseline',algorithm:'Greedy',family:'Classical',variant:'greedy',library:null,params:{},quboWeights:{weight_coverage:1,weight_redundancy:0.5,weight_flanking:1,weight_cover:0.5,weight_distance:0.1,penalty_conflict:0},timeBudgetMs:250,isActive:true,isAbArm:true,sessionCount:20,resultCount:50,createdAt:now,updatedAt:now}];
const history=[];
function counts(v){return Object.fromEntries(api.resources.map(([key,,name])=>[name==='EnemyType'?'enemyTypes':name==='LootTable'?'lootTables':name==='CraftingRecipe'?'craftingRecipes':key,entities.get(v.id)[key].length]));}
function envelope(items,url){const page=Number(url.searchParams.get('page')||1),pageSize=Number(url.searchParams.get('pageSize')||20);return {items:items.slice((page-1)*pageSize,page*pageSize),page,pageSize,totalCount:items.length,totalPages:Math.ceil(items.length/pageSize)};}
function token(user){return {accessToken:'fixture:'+user.id,refreshToken:'fixture-refresh:'+user.id,accessTokenExpiresAt:new Date(Date.now()+900000).toISOString(),refreshTokenExpiresAt:new Date(Date.now()+86400000).toISOString(),user};}
const overview={sessions:24,players:8,unfinishedSessions:2,avgDurationSeconds:185,medianDurationSeconds:170,outcomes:[{outcome:'Completed',sessions:16,share:0.667},{outcome:'Died',sessions:6,share:0.25},{outcome:'InProgress',sessions:2,share:0.083}],sessionsPerDay:[{day:now.slice(0,10),sessions:24}]};
const funnel={sessionsStarted:24,objectives:[{objectiveIndex:0,sessions:22,shareOfStarted:0.917},{objectiveIndex:1,sessions:18,shareOfStarted:0.75}],missionsCompleted:16,completionRate:0.667};
const weapons={finishedSessions:22,weapons:[{weapon:'rifle',shots:550,kills:58,killsPerShot:0.105,sessionsUsed:18,sessionShare:0.818}]};
const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:15173');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');res.setHeader('X-ShadowVale-Test','isolated-fixture');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 const url=new URL(req.url,'http://localhost:15079'),route=url.pathname.replace(/^\/api/,'');let raw='';for await(const chunk of req)raw+=chunk;
 let body={};try{body=raw?JSON.parse(raw):{};}catch{res.writeHead(400);res.end();return;}
 const respond=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(status===204?undefined:typeof value==='string'?value:JSON.stringify(value));};
 const deny=(status,message)=>respond({title:'Fixture error',message,code:'fixture',errors:{}},status);
 const user=users[req.headers.authorization?.split(':').at(-1)];
 try{
  if(route==='/auth/login'){const user=users[String(body.usernameOrEmail).split('@')[0]];return user&&body.password==='test-only'?respond(token(user)):deny(401,'Use fixture designer/admin/analyst@example.test with test-only.');}
  if(route==='/auth/refresh'){const u=users[String(body.refreshToken).split(':').at(-1)];return u?respond(token(u)):deny(401,'Invalid fixture token');}
  if(route==='/auth/logout')return respond(null,204);
  if(!user)return deny(401,'Fixture sign-in required');
  if(route==='/auth/me')return respond(user);
  if(route==='/auth/me/password')return respond(null,204);
  if(route==='/meta/enums')return respond(enumData);
  if(route.startsWith('/users')){
   if(user.role!=='Admin')return deny(403,'Admin only');
   const id=route.split('/')[2],account=Object.values(users).find(u=>u.id===id);
   if(req.method==='GET'){
    if(id)return account?respond(account):deny(404,'Account missing');
    const search=(url.searchParams.get('search')||'').toLowerCase(),role=url.searchParams.get('role'),active=url.searchParams.get('isActive');
    return respond(envelope(Object.values(users).filter(u=>(!search||(u.username+' '+u.fullName+' '+u.email).toLowerCase().includes(search))&&(!role||u.role===role)&&(active===null||u.isActive===(active==='true'))),url));
   }
   if(req.method==='POST'){
    if(Object.values(users).some(u=>u.username===body.username||u.email===body.email))return respond({message:'Username/email already exists',errors:{Username:['Choose another username.']}},409);
    const created={id:randomUUID(),username:body.username,email:body.email,fullName:body.fullName,role:body.role,isActive:true,lastLoginAt:null,createdAt:now};
    users[created.username]=created;return respond(created,201);
   }
   if(!account)return deny(404,'Account missing');
   if(route.endsWith('/password'))return respond(null,204);
   if(id===user.id&&(body.role!=='Admin'||!body.isActive))return deny(400,'Cannot change your own role or deactivate your account');
   Object.assign(account,body);return respond(account);
  }
  if(route==='/content-publications')return user.role==='Admin'?respond(envelope(history,url)):deny(403,'Publication history is Admin only');
  if(route.startsWith('/content-versions/')&&route.endsWith('/compare')){
   const a=versions.find(v=>v.id===route.split('/')[2]),b=versions.find(v=>v.id===url.searchParams.get('targetId'));if(!a||!b)return deny(404,'Version missing');
   const left=api.entitiesToEditor(a,entities.get(a.id)),right=api.entitiesToEditor(b,entities.get(b.id));
   const differences=api.compareBundles(left,right).filter(d=>!d.path.endsWith('/api_id')&&!d.path.endsWith('/updated_at')&&!['/content_version_id','/version_no'].includes(d.path)).map(d=>({...d,before:d.before??null,after:d.after??null}));
   return respond({sourceId:a.id,sourceRevision:a.revision,targetId:b.id,targetRevision:b.revision,differences});
  }
  if(route==='/content-versions'){
   if(user.role==='Analyst')return deny(403,'Content metadata not available to Analyst');
   if(req.method==='GET'){const status=url.searchParams.get('status');return respond(envelope([...versions].filter(v=>status?v.status===status:v.status!=='Archived').sort((a,b)=>b.versionNo-a.versionNo),url));}
   if(user.role!=='Designer')return deny(403,'Authoring denied');
   const base=versions.find(v=>v.id===body.parentVersionId)||versions[0],v={...structuredClone(base),id:randomUUID(),versionNo:Math.max(...versions.map(v=>v.versionNo))+1,label:body.label,changelog:body.changelog,parentVersionId:body.parentVersionId,status:'Draft',revision:1,isValidated:false,validatedAt:null,publishedAt:null,publishedById:null,reviewedById:null};
   const rows=structuredClone(entities.get(base.id));for(const [key]of api.resources)for(const row of rows[key])row.id=randomUUID();versions.push(v);entities.set(v.id,rows);return respond(v,201);
  }
  const match=route.match(/^\/content-versions\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if(match){
   const v=versions.find(v=>v.id===match[1]);if(!v)return deny(404,'Version missing');
   const resource=api.resources.find(r=>r[1]===match[2]);
   if(!match[2]){
    if(user.role==='Analyst')return deny(403,'Content version access denied');
    if(req.method==='GET')return respond({version:v,bundle:api.entitiesToEditor(v,entities.get(v.id))});
    if(req.method==='PUT'){if(body.revision!==v.revision||v.status!=='Draft')return deny(409,'Version conflict');Object.assign(v,body);v.revision++;v.validatedAt=null;v.bundleChecksum=null;return respond(v);}
    if(req.method==='DELETE'){if(body.revision!==v.revision||v.status!=='Draft')return deny(409,'Version conflict');v.status='Archived';v.revision++;return respond(null,204);}
   }
   if(resource){
    if(user.role==='Analyst')return deny(403,'Authoring data not available to Analyst');
    const rows=entities.get(v.id)[resource[0]],row=rows.find(r=>r.id===match[3]);
    if(req.method==='GET')return respond(match[3]?row:resource[0]==='maps'?rows.map(({enemyPlacements,lootTables,navGraph,layout,...r})=>({...r,enemyCount:enemyPlacements.length,lootTableCount:lootTables.length})):rows);
    if(!['Draft','Rejected'].includes(v.status))return deny(409,'Version locked');
    v.status='Draft';v.revision++;v.validatedAt=null;v.bundleChecksum=null;
    if(req.method==='POST'){const created={...body,id:randomUUID()};rows.push(created);return respond(created,201);}
    if(!row)return deny(404,'Record missing');
    if(req.method==='PUT'){Object.assign(row,body);return respond(row);}
    if(req.method==='DELETE'){rows.splice(rows.indexOf(row),1);return respond(null,204);}
   }
   if(match[2]==='bundle'){if(user.role==='Analyst')return deny(403,'Bundle unavailable to Analyst');if(!v.bundleChecksum)return deny(409,'Validate current content first');const bundle=api.entitiesToEditor(v,entities.get(v.id));for(const value of Object.values(bundle))if(Array.isArray(value))for(const row of value){delete row.api_id;delete row.updated_at;}return respond(JSON.stringify(bundle,null,2));}
   if(match[2]==='validate'){if(body.revision!==v.revision||v.status!=='Draft')return deny(409,'Version conflict');v.revision++;v.validatedAt=now;v.bundleChecksum='a'.repeat(64);return respond({id:v.id,revision:v.revision,isValid:true,errors:[],validatedAt:now,bundleChecksum:v.bundleChecksum});}
   if(body.revision!==v.revision)return deny(409,'Revision conflict');
   if(match[2]==='submit'){if(!v.bundleChecksum)return deny(400,'Validate first');v.status='InReview';v.revision++;v.submittedAt=now;return respond(v);}
   if(user.role!=='Admin')return deny(403,'Admin only');
   if(match[2]==='approve'||match[2]==='reject'){v.status=match[2]==='approve'?'Approved':'Rejected';v.reviewedById=user.id;v.reviewNote=body.reviewNote;v.revision++;return respond(v);}
   if(match[2]==='publish'||match[2]==='rollback'){const previous=versions.find(v=>v.status==='Published');if(previous){previous.status='Archived';previous.archivedAt=now;}v.status='Published';v.publishedAt=now;v.publishedById=user.id;v.revision++;history.unshift({id:randomUUID(),action:match[2]==='publish'?'Publish':'Rollback',contentVersionId:v.id,versionNo:v.versionNo,versionLabel:v.label,previousVersionId:previous?.id||null,previousVersionNo:previous?.versionNo||null,actorId:user.id,actorUsername:user.username,reason:body.reason,createdAt:now});return respond(v);}
  }
  if(route.startsWith('/solver-configurations')){
   if(req.method==='GET')return respond(route==='/solver-configurations'?solvers:solvers.find(s=>route.endsWith('/'+s.id)));
   if(!['Analyst','Admin'].includes(user.role))return deny(403,'Solver mutations require Analyst or Admin');
   const id=route.split('/')[2],row=solvers.find(s=>s.id===id);
   if(route.endsWith('/clone')){const clone={...structuredClone(row),...body,id:randomUUID(),isActive:false,isAbArm:false,sessionCount:0,resultCount:0};solvers.push(clone);return respond(clone);}
   if(req.method==='POST'){const row={...structuredClone(solvers[0]),...body,id:randomUUID(),family:body.algorithm==='Genetic'?'Classical':'QuantumInspired',variant:body.code,isActive:false,isAbArm:false,sessionCount:0,resultCount:0};solvers.push(row);return respond(row,201);}
   if(req.method==='DELETE'){solvers=solvers.filter(s=>s.id!==id);return respond(null,204);}
   Object.assign(row,body);return respond(row);
  }
  if(route.startsWith('/analytics')){
   if(route.includes('/export/')){res.writeHead(200,{'Content-Type':'text/csv'});return res.end('\uFEFFsession_id,source\nfixture,human\n');}
   if(route==='/analytics/overview')return respond(overview);
   if(route==='/analytics/funnel')return respond(funnel);
   if(route==='/analytics/weapons')return respond(weapons);
   if(route==='/analytics/playstyle')return respond({finishedSessions:22,sessionsWithoutKills:2,avgStealthRatio:0.4,medianStealthRatio:0.3,avgTimesDetected:1.5,medianTimesDetected:1,stealthRatioHistogram:[{from:0,to:0.1,sessions:5},{from:0.1,to:0.2,sessions:6},{from:0.8,to:0.9,sessions:9}]});
   if(route==='/analytics/heatmap')return respond({mapCode:url.searchParams.get('mapCode'),cellSize:Number(url.searchParams.get('cellSize')),eventTypes:['player_death'],cells:[{x:0,y:0,count:4},{x:5,y:0,count:2},{x:5,y:5,count:7}]});
   if(route==='/analytics/ai/comparison')return respond([{contentVersionId:versions[0].id,contentVersionLabel:versions[0].label,groupKey:'greedy',groupLabel:'Greedy',family:'Classical',sessions:20,encounters:34,captures:16,escapes:18,captureRate:0.471,avgEscapeSeconds:13,medianEscapeSeconds:12,replans:100,avgCoordinationScore:0.82,latencyP50Ms:4,latencyP95Ms:9,latencyP99Ms:11,withinBudgetRate:1,fallbackRate:0}]);
   if(route==='/analytics/ai/scalability')return respond([{configurationId:solvers[0].id,code:'greedy',family:'Classical',numAgents:4,nodesFrom:20,nodesTo:39,replans:40,latencyP50Ms:4,latencyP95Ms:9,avgObjective:0.8,withinBudgetRate:1}]);
   if(route==='/analytics/versions/compare')return respond({a:{contentVersionId:url.searchParams.get('a'),overview,funnel,weapons},b:{contentVersionId:url.searchParams.get('b'),overview,funnel,weapons}});
  }
  return deny(404,'No fixture handler '+route);
 }catch(e){console.error(e.message);return deny(500,e.message);}
});
server.listen(15079,'127.0.0.1',()=>console.log('Isolated contract fixture API: 15079. QA accounts: designer/admin/analyst@example.test, password test-only.'));
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','15173','--strictPort'],{env:{...process.env,VITE_DEMO_MODE:'false',VITE_API_BASE_URL:'http://127.0.0.1:15079/api'},stdio:'inherit',windowsHide:true});
function close(){vite.kill();server.close(()=>process.exit(0));}
process.on('SIGINT',close);process.on('SIGTERM',close);vite.on('exit',()=>server.close(()=>process.exit(0)));
