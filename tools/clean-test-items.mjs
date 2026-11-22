import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Plan by default. Remove known test items only from never-published, unreferenced versions.
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
  application_name:'shadowvale-test-item-cleanup'});
const testCodes=['test_ammo_pistol','test_ammo_rifle','test_pistol','test_rifle'];
const expectedCount=Number(option('--expected-items'));
if(process.argv.includes('--write')&&(!process.argv.includes('--expected-items')||!Number.isSafeInteger(expectedCount)||expectedCount<1))
  throw new Error('--write requires --expected-items <reviewed plan count>.');
const allItems=()=>client.query(`SELECT i.*,v.version_no,v.status,v.revision,v.published_at,
 (SELECT count(*)::int FROM shadowvale.game_sessions s WHERE s.content_version_id=v.id) AS sessions,
 (SELECT count(*)::int FROM shadowvale.content_publication_history h WHERE h.content_version_id=v.id OR h.previous_version_id=v.id) AS history
 FROM shadowvale.items i JOIN shadowvale.content_versions v ON v.id=i.content_version_id
 WHERE left(i.code,5)='test_' OR i.name ILIKE 'test %' ORDER BY v.version_no,i.code`);
const summarize=rows=>Object.values(rows.reduce((groups,row)=>{
  const n=row.version_no;groups[n]??={versionNo:n,status:row.status,items:0};groups[n].items++;return groups;
},{}));
// Digests stay inside the transaction: never export users, tokens, session payloads or telemetry.
const protectedDigest=async versionIds=>{
  const result={};
  for(const table of ['items','content_versions','maps','enemy_types','crafting_recipes','skills','loot_tables','quests']){
    const key=table==='content_versions'?'id':'content_version_id';
    result[table]=(await client.query(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY t.id),'')) AS hash FROM shadowvale.${table} t WHERE NOT (${key}=ANY($1::uuid[]))`,[versionIds])).rows[0].hash;
  }
  result.weapons=(await client.query(`SELECT md5(coalesce(string_agg(to_jsonb(w)::text,'' ORDER BY w.id),'')) AS hash FROM shadowvale.weapons w JOIN shadowvale.items i ON i.id=w.item_id WHERE NOT (i.content_version_id=ANY($1::uuid[]))`,[versionIds])).rows[0].hash;
  for(const table of ['content_publication_history','game_sessions'])result[table]=(await client.query(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY t.id),'')) AS hash FROM shadowvale.${table} t`)).rows[0].hash;
  return JSON.stringify(result);
};
let transaction=false;
try{
  await client.connect();await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');transaction=true;
  await client.query("SET LOCAL statement_timeout='20s'");
  const found=(await allItems()).rows;
  if(found.some(i=>!testCodes.includes(i.code)))throw new Error('Unrecognized test-like item; review manually before cleanup.');
  const eligible=found.filter(i=>['Draft','Rejected','Archived'].includes(i.status)&&!i.published_at&&i.sessions===0&&i.history===0);
  const versionIds=[...new Set(eligible.map(i=>i.content_version_id))],itemIds=eligible.map(i=>i.id);
  const protectedItems=found.filter(i=>!itemIds.includes(i.id));
  const versions=(await client.query('SELECT * FROM shadowvale.content_versions WHERE id=ANY($1::uuid[]) ORDER BY version_no FOR UPDATE',[versionIds])).rows;
  for(const v of versions)if(eligible.some(i=>i.content_version_id===v.id&&(i.status!==v.status||i.revision!==v.revision)))throw new Error('Version changed; reload the cleanup plan.');
  const items=(await client.query('SELECT * FROM shadowvale.items WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[itemIds])).rows;
  const weapons=(await client.query('SELECT * FROM shadowvale.weapons WHERE item_id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[itemIds])).rows;
  const weaponIds=weapons.map(w=>w.id);
  for(const [table,column,ids] of [['consumables','item_id',itemIds],['crafting_recipe_ingredients','item_id',itemIds],['crafting_recipes','output_item_id',itemIds],['loot_table_entries','item_id',itemIds],['quest_rewards','item_id',itemIds],['enemy_types','weapon_id',weaponIds]]){
    const uses=(await client.query(`SELECT count(*)::int AS n FROM shadowvale.${table} WHERE ${column}=ANY($1::uuid[])`,[ids])).rows[0].n;
    if(uses)throw new Error(`Test items still referenced by ${table}; no cascade deletion allowed.`);
  }
  const externalAmmo=(await client.query('SELECT count(*)::int AS n FROM shadowvale.weapons WHERE ammo_item_id=ANY($1::uuid[]) AND NOT (id=ANY($2::uuid[]))',[itemIds,weaponIds])).rows[0].n;
  if(externalAmmo)throw new Error('Other weapons use the test ammo; cleanup refused.');
  const plan={eligibleItems:items.length,eligibleWeapons:weapons.length,versions:summarize(eligible),protectedItems:protectedItems.length,protectedVersions:summarize(protectedItems)};
  if(!process.argv.includes('--write')||!items.length){await client.query('ROLLBACK');transaction=false;console.log(JSON.stringify({mode:'plan',...plan},null,2));}
  else{
    if(items.length!==expectedCount)throw new Error('Item count changed since the reviewed plan.');
    const digest=await protectedDigest(versionIds);
    const backupDir=path.join(root,'output/local-unity-integration');fs.mkdirSync(backupDir,{recursive:true});
    const backup=path.join(backupDir,`test-items-before-${Date.now()}.json`);
    fs.writeFileSync(backup,JSON.stringify({versions,items,weapons},null,2)+'\n',{flag:'wx'});
    const removedWeapons=await client.query('DELETE FROM shadowvale.weapons WHERE id=ANY($1::uuid[])',[weaponIds]);
    const removedItems=await client.query('DELETE FROM shadowvale.items WHERE id=ANY($1::uuid[]) AND content_version_id=ANY($2::uuid[])',[itemIds,versionIds]);
    if(removedWeapons.rowCount!==weapons.length||removedItems.rowCount!==items.length)throw new Error('Deletion counts changed; rolled back.');
    for(const v of versions){
      const updated=await client.query(`UPDATE shadowvale.content_versions SET revision=revision+1,updated_at=now(),
       status=CASE WHEN status='Rejected' THEN 'Draft' ELSE status END,
       submitted_at=CASE WHEN status='Rejected' THEN NULL ELSE submitted_at END,
       reviewed_by_id=CASE WHEN status='Rejected' THEN NULL ELSE reviewed_by_id END,
       reviewed_at=CASE WHEN status='Rejected' THEN NULL ELSE reviewed_at END,
       review_note=CASE WHEN status='Rejected' THEN NULL ELSE review_note END,
       bundle=NULL,bundle_checksum=NULL,validated_at=NULL,validation_errors=NULL,
       changelog=coalesce(changelog,'')||E'\nRemoved known test items during database cleanup.'
       WHERE id=$1 AND revision=$2 AND published_at IS NULL AND status IN ('Draft','Rejected','Archived')`,[v.id,v.revision]);
      if(updated.rowCount!==1)throw new Error('Version changed during cleanup; rolled back.');
    }
    if((await client.query('SELECT count(*)::int AS n FROM shadowvale.items WHERE id=ANY($1::uuid[])',[itemIds])).rows[0].n)throw new Error('Test items remain; rolled back.');
    if(await protectedDigest(versionIds)!==digest)throw new Error('Protected game data or history changed; rolled back.');
    await client.query('COMMIT');transaction=false;
    console.log(JSON.stringify({mode:'committed',...plan,backup,publishedAndHistoryUnchanged:true},null,2));
  }
}catch(e){if(transaction)await client.query('ROLLBACK');console.error(JSON.stringify({code:e.code??'CLEANUP_FAILED',message:e.code?'Database cleanup failed; transaction rolled back.':e.message}));process.exitCode=1;}
finally{await client.end();}
