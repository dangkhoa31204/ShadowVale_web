import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { assertLegacyTestBundle, legacyTestItems, legacyTestMaps } from './legacy-test-content.mjs';

// Plan by default. Explicit maintenance retires only reviewed legacy test content; real game data and telemetry stay untouched.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = flag => process.argv[process.argv.indexOf(flag) + 1];
const modulePath = process.argv.includes('--pg-module') ? pathToFileURL(path.resolve(option('--pg-module'))).href : 'pg';
const { default: pg } = await import(modulePath);
const envFile=path.join(root,'backend/shadowvale_be/.env');
const text = fs.existsSync(envFile)?fs.readFileSync(envFile,'utf8'):'';
const line = text.split(/\r?\n/).find(l=>l.startsWith('ConnectionStrings__Default='));
const raw = (process.env.ConnectionStrings__Default ?? line?.slice(line.indexOf('=')+1) ?? '').trim().replace(/^(["'])(.*)\1$/,'$2');
if(!raw) throw new Error('Configure ConnectionStrings__Default; credentials are never printed.');
const config = Object.fromEntries((raw.match(/(?:[^;"']|"[^"]*"|'[^']*')+/g)??[]).map(p=>{const at=p.indexOf('=');return[p.slice(0,at).trim().toLowerCase().replaceAll(' ',''),p.slice(at+1).trim().replace(/^(["'])(.*)\1$/,'$2')];}));
const caFile = process.argv.includes('--ca') ? option('--ca') : config.rootcertificate;
const client = new pg.Client({host:config.host,port:Number(config.port||5432),database:config.database,user:config.username||config.userid,password:config.password,
  ssl: caFile ? {ca:fs.readFileSync(caFile),rejectUnauthorized:true} : {rejectUnauthorized:!/^require$/i.test(config.sslmode??'')},connectionTimeoutMillis:15000,
  application_name:'shadowvale-test-content-retirement'});
const expected={items:Number(option('--expected-items')),weapons:Number(option('--expected-weapons')),maps:Number(option('--expected-maps')),bundles:Number(option('--expected-bundles'))};
if(process.argv.includes('--write')&&(!process.argv.includes('--retire-published-test')||
   Object.entries(expected).some(([k,n])=>!process.argv.includes('--expected-'+k)||!Number.isSafeInteger(n)||n<0)))
  throw new Error('--write requires --retire-published-test and reviewed --expected-items/weapons/maps/bundles counts.');
const parents=['items','maps','skills','enemy_types','loot_tables','crafting_recipes','quests'];
const digest=async(versionIds,itemIds)=>{
  const result={};
  for(const table of [...parents,'content_versions']){
    const key=table==='content_versions'?'id':'content_version_id';
    result[table]=(await client.query(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY t.id),'')) AS hash FROM shadowvale.${table} t WHERE NOT (${key}=ANY($1::uuid[]))`,[versionIds])).rows[0].hash;
  }
  result.weapons=(await client.query("SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY t.id),'')) AS hash FROM shadowvale.weapons t WHERE NOT (item_id=ANY($1::uuid[]))",[itemIds])).rows[0].hash;
  // Compute server-side hashes only: never export account/token/telemetry contents.
  for(const table of ['consumables','crafting_recipe_ingredients','enemy_placements','loot_table_entries','map_loot_tables','quest_rewards',
    'users','refresh_tokens','players','solver_configurations','game_sessions','telemetry_events','coordination_results','content_publication_history'])
    result[table]=(await client.query(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY t.id),'')) AS hash FROM shadowvale.${table} t`)).rows[0].hash;
  return JSON.stringify(result);
};
let transaction=false;
try{
  await client.connect();await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');transaction=true;
  await client.query("SET LOCAL statement_timeout='30s'");
  const versions=(await client.query('SELECT * FROM shadowvale.content_versions WHERE version_no BETWEEN 3 AND 14 ORDER BY version_no FOR UPDATE')).rows;
  if(versions.length!==12)throw new Error('Legacy version set changed; review before retirement.');
  for(const v of versions){
    assertLegacyTestBundle(Number(v.version_no),v.bundle);
    if(!['Draft','Rejected','Archived','Published'].includes(v.status))throw new Error('Unreviewed version state; retirement refused.');
    if(v.status==='Published'&&Number(v.version_no)!==9)throw new Error('The published version changed; retirement refused.');
  }
  const versionIds=versions.map(v=>v.id),rows={};
  for(const table of parents)rows[table]=(await client.query(`SELECT * FROM shadowvale.${table} WHERE content_version_id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`,[versionIds])).rows;
  if(rows.items.some(i=>!legacyTestItems.has(i.code))||rows.maps.some(m=>!legacyTestMaps.has(m.code)))
    throw new Error('Legacy rows include unknown or real content; retirement refused.');
  for(const table of parents.filter(t=>!['items','maps'].includes(t)))if(rows[table].length)throw new Error(`Legacy ${table} contains non-test content; retirement refused.`);
  const itemIds=rows.items.map(i=>i.id),mapIds=rows.maps.map(m=>m.id);
  const weapons=(await client.query('SELECT * FROM shadowvale.weapons WHERE item_id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[itemIds])).rows;
  const weaponIds=weapons.map(w=>w.id);
  for(const [table,column,ids] of [['consumables','item_id',itemIds],['crafting_recipe_ingredients','item_id',itemIds],['crafting_recipes','output_item_id',itemIds],
    ['loot_table_entries','item_id',itemIds],['quest_rewards','item_id',itemIds],['enemy_types','weapon_id',weaponIds],
    ['map_loot_tables','map_id',mapIds],['enemy_placements','map_id',mapIds]]){
    if((await client.query(`SELECT count(*)::int AS n FROM shadowvale.${table} WHERE ${column}=ANY($1::uuid[])`,[ids])).rows[0].n)
      throw new Error(`Dependent ${table} found; review before retirement. No cascade deletion allowed.`);
  }
  const externalAmmo=(await client.query('SELECT count(*)::int AS n FROM shadowvale.weapons WHERE ammo_item_id=ANY($1::uuid[]) AND NOT (id=ANY($2::uuid[]))',[itemIds,weaponIds])).rows[0].n;
  if(externalAmmo)throw new Error('Real weapons reference test ammo; retirement refused.');
  const counts={items:rows.items.length,weapons:weapons.length,maps:rows.maps.length,bundles:versions.filter(v=>v.bundle!=null).length};
  const live=versions.filter(v=>v.status==='Published').map(v=>Number(v.version_no));
  const plan={counts,retireVersions:versions.map(v=>Number(v.version_no)),retirePublished:live,
    keepGameDraft:15,keepSessionsAndPublicationLogs:true};
  if(!process.argv.includes('--write')||Object.values(counts).every(n=>n===0)&&!live.length){
    await client.query('ROLLBACK');transaction=false;console.log(JSON.stringify({mode:'plan',...plan},null,2));
  }else{
    if(Object.entries(counts).some(([k,n])=>n!==expected[k])||live.length!==1||live[0]!==9)
      throw new Error('Counts or Published state changed since the reviewed plan.');
    const before=await digest(versionIds,itemIds);
    const backupDir=path.join(root,'output/local-unity-integration');fs.mkdirSync(backupDir,{recursive:true});
    const backup=path.join(backupDir,`legacy-test-content-before-${Date.now()}.json`);
    fs.writeFileSync(backup,JSON.stringify({versions,rows,weapons},null,2)+'\n',{flag:'wx'});
    const removedWeapons=await client.query('DELETE FROM shadowvale.weapons WHERE id=ANY($1::uuid[])',[weaponIds]);
    const removedItems=await client.query('DELETE FROM shadowvale.items WHERE id=ANY($1::uuid[]) AND content_version_id=ANY($2::uuid[])',[itemIds,versionIds]);
    const removedMaps=await client.query('DELETE FROM shadowvale.maps WHERE id=ANY($1::uuid[]) AND content_version_id=ANY($2::uuid[])',[mapIds,versionIds]);
    if(removedWeapons.rowCount!==counts.weapons||removedItems.rowCount!==counts.items||removedMaps.rowCount!==counts.maps)
      throw new Error('Deletion counts changed; rolled back.');
    for(const v of versions){
      const result=await client.query(`UPDATE shadowvale.content_versions SET status='Archived',revision=revision+1,
        archived_at=coalesce(archived_at,now()),updated_at=now(),published_at=NULL,published_by_id=NULL,
        bundle=NULL,bundle_checksum=NULL,validated_at=NULL,validation_errors=NULL,
        changelog=coalesce(changelog,'')||E'\nRetired known legacy test content; retained metadata for session/publication references. Not eligible for rollback.'
        WHERE id=$1 AND revision=$2`,[v.id,v.revision]);
      if(result.rowCount!==1)throw new Error('Version changed during retirement; rolled back.');
    }
    if(before!==await digest(versionIds,itemIds))throw new Error('Real game, account, session or history data changed; rolled back.');
    const remainingItems=(await client.query("SELECT count(*)::int AS n FROM shadowvale.items WHERE left(code,5)='test_' OR name ILIKE 'test %'")).rows[0].n;
    const remainingMaps=(await client.query("SELECT count(*)::int AS n FROM shadowvale.maps WHERE left(code,5)='test_' OR name ILIKE 'test %'")).rows[0].n;
    const remainingBundles=(await client.query("SELECT count(*)::int AS n FROM shadowvale.content_versions WHERE coalesce(bundle::text ILIKE '%test_pistol%',false) OR coalesce(bundle::text ILIKE '%test_field%',false)")).rows[0].n;
    if(remainingItems||remainingMaps||remainingBundles)throw new Error('Test content still found; rolled back for review.');
    const published=(await client.query("SELECT version_no FROM shadowvale.content_versions WHERE status='Published'")).rows;
    await client.query('COMMIT');transaction=false;
    console.log(JSON.stringify({mode:'committed',...plan,backup,remainingTestItems:0,remainingTestMaps:0,remainingTestBundles:0,
      published,gameDataSessionsAndHistoryUnchanged:true},null,2));
  }
}catch(e){if(transaction)await client.query('ROLLBACK');console.error(JSON.stringify({code:e.code??'RETIREMENT_FAILED',constraint:e.constraint,message:e.code?'Database retirement failed; transaction rolled back.':e.message}));process.exitCode=1;}
finally{await client.end();}
