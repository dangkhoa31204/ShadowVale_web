import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Plan by default. Explicit --write updates only one revision-locked Draft; never publishes or deletes history.
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
  application_name:'shadowvale-unity-weapons-sync'});
const versionNo = Number(option('--version'));
const revision = Number(option('--revision'));
const designer = option('--designer');
if (!process.argv.includes('--version') || !Number.isSafeInteger(versionNo) || versionNo < 1 ||
    !process.argv.includes('--revision') || !Number.isSafeInteger(revision) || revision < 0 ||
    !process.argv.includes('--designer') || !designer || designer.startsWith('--'))
  throw new Error('Usage: --version <number> --revision <current> --designer <username> [--write] [--pg-module <path>]');
const catalog = JSON.parse(fs.readFileSync(path.join(root,'backend/shadowvale_be/ShadowVale.BLL/Catalog/unity-catalog.json')));
const require = createRequire(import.meta.url);
const Ajv = require('../frontend/shadowvale_fe/node_modules/ajv');
const schema = JSON.parse(fs.readFileSync(path.join(root,'backend/shadowvale_be/ShadowVale.BLL/Schemas/content-bundle-1.0.schema.json')));
const validate = new Ajv({allErrors:true,multipleOfPrecision:8}).compile(schema);
if(!validate(catalog.authoringBundle))throw new Error('Unity authoring bundle failed schema validation.');
const expected = catalog.authoringBundle.weapons;
const expectedCodes = new Set(expected.map(w=>w.item_code));
const referenceOnly = new Set(catalog.weapons.filter(w=>!w.playable).map(w=>w.id));
const pruneUnused = process.argv.includes('--prune-unused');
const numeric = {damage:'damage',fire_rate:'fire_rate',effective_range:'effective_range',magazine_size:'magazine_size',
  reload_time_s:'reload_time_seconds',max_durability:'max_durability',durability_per_use:'durability_per_use',noise_radius:'noise_radius'};
const pascal = s => s.split('_').map(w=>w[0].toUpperCase()+w.slice(1)).join('');
const readWeapons = async id => (await client.query(`SELECT w.*,i.code,a.code AS ammo_code
  FROM shadowvale.weapons w JOIN shadowvale.items i ON i.id=w.item_id
  LEFT JOIN shadowvale.items a ON a.id=w.ammo_item_id WHERE i.content_version_id=$1 ORDER BY i.code`,[id])).rows;
const differences = rows => {
  if(rows.length!==expected.length || new Set(rows.map(r=>r.code)).size!==expected.length ||
     rows.some(r=>!expected.some(w=>w.item_code===r.code))) throw new Error('Weapon code set differs from Unity; review missing/extra rows before sync.');
  return expected.flatMap(w=>{
    const r=rows.find(r=>r.code===w.item_code), changed=[];
    for(const [source,db] of Object.entries(numeric)) if(Number(r[db])!==w[source])changed.push({field:db,before:Number(r[db]),after:w[source]});
    for(const [field,value] of Object.entries({class:pascal(w.weapon_class),ammo_code:w.ammo_item_code,is_suppressed:w.is_suppressed}))
      if(r[field]!==value)changed.push({field,before:r[field],after:value});
    return changed.length?[{code:r.code,changes:changed}]:[];
  });
};
// Verify full rows outside the target, including publication state/history, remain untouched.
const untouched = async id => (await client.query(`SELECT jsonb_build_object(
 'weapons',(SELECT jsonb_agg(to_jsonb(w) ORDER BY w.id) FROM shadowvale.weapons w JOIN shadowvale.items i ON i.id=w.item_id WHERE i.content_version_id<>$1),
 'versions',(SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM shadowvale.content_versions v WHERE v.id<>$1),
 'items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) FROM shadowvale.items i WHERE i.content_version_id<>$1),
 'enemies',(SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM shadowvale.enemy_types e WHERE e.content_version_id<>$1),
 'history',(SELECT jsonb_agg(to_jsonb(h) ORDER BY h.id) FROM shadowvale.content_publication_history h)) AS data`,[id])).rows[0].data;
let transaction=false;
try {
  await client.connect();await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');transaction=true;
  await client.query("SET LOCAL statement_timeout='20s'");
  const version=(await client.query('SELECT * FROM shadowvale.content_versions WHERE version_no=$1 FOR UPDATE',[versionNo])).rows[0];
  if(!version || version.status!=='Draft' || Number(version.revision)!==revision) throw new Error('Target must be an existing Draft at the expected revision; reload before syncing.');
  const author=(await client.query("SELECT id FROM shadowvale.users WHERE username=$1 AND is_active AND role='Designer' FOR SHARE",[designer])).rows;
  if(author.length!==1)throw new Error('Expected exactly one active Designer for the requested username.');
  const before=await readWeapons(version.id),removed=before.filter(w=>!expectedCodes.has(w.code));
  if(removed.length && (!pruneUnused || removed.some(w=>!referenceOnly.has(w.code))))throw new Error('Unexpected weapon codes. Use --prune-unused only for source definitions marked reference-only.');
  const changes=differences(before.filter(w=>expectedCodes.has(w.code))),ownerChanged=version.authored_by_id!==author[0].id;
  const removedIds=removed.map(w=>w.id),itemIds=removed.map(w=>w.item_id);
  const removedItems=(await client.query('SELECT * FROM shadowvale.items WHERE id=ANY($1::uuid[]) AND content_version_id=$2 ORDER BY id',[itemIds,version.id])).rows;
  const enemyLinks=(await client.query('SELECT * FROM shadowvale.enemy_types WHERE weapon_id=ANY($1::uuid[]) ORDER BY id',[removedIds])).rows;
  for(const e of enemyLinks)if(e.content_version_id!==version.id || catalog.authoringBundle.enemy_types.find(row=>row.code===e.code)?.weapon_item_code!==null)
    throw new Error('Unsupported enemy dependency on a reference-only weapon; review before removing.');
  // Never cascade-delete other content. Unknown references stop the whole transaction.
  for(const [table,column] of [['loot_table_entries','item_id'],['crafting_recipes','output_item_id'],['crafting_recipe_ingredients','item_id'],['quest_rewards','item_id'],['weapons','ammo_item_id']]){
    const uses=(await client.query(`SELECT count(*)::int AS n FROM shadowvale.${table} WHERE ${column}=ANY($1::uuid[])`,[itemIds])).rows[0].n;
    if(uses)throw new Error(`Reference-only items are still used by ${table}; review before removing.`);
  }
  const plan={versionNo,status:version.status,revision,designer,sourceHash:catalog.sourceHash,weaponCount:before.length,targetWeaponCount:expected.length,changes,ownerChanged,
    removeReferenceOnly:removed.map(w=>w.code),clearPrototypeWeaponLinks:enemyLinks.map(e=>e.code)};
  if(!process.argv.includes('--write') || (!changes.length&&!ownerChanged&&!removed.length)){
    await client.query('ROLLBACK');transaction=false;console.log(JSON.stringify({mode:'plan',...plan},null,2));
  }else{
    const unchanged=JSON.stringify(await untouched(version.id));
    const backupDir=path.join(root,'output/local-unity-integration');fs.mkdirSync(backupDir,{recursive:true});
    const backup=path.join(backupDir,`weapons-v${versionNo}-before-${Date.now()}.json`);
    fs.writeFileSync(backup,JSON.stringify({version,weapons:before,removedItems,enemyLinks,sourceHash:catalog.sourceHash},null,2)+'\n',{flag:'wx'});
    if(removed.length){
      const cleared=await client.query('UPDATE shadowvale.enemy_types SET weapon_id=NULL,updated_at=now() WHERE content_version_id=$1 AND weapon_id=ANY($2::uuid[])',[version.id,removedIds]);
      const deleted=await client.query('DELETE FROM shadowvale.weapons w USING shadowvale.items i WHERE w.id=ANY($1::uuid[]) AND w.item_id=i.id AND i.content_version_id=$2',[removedIds,version.id]);
      const deletedItems=await client.query('DELETE FROM shadowvale.items WHERE id=ANY($1::uuid[]) AND content_version_id=$2',[itemIds,version.id]);
      if(cleared.rowCount!==enemyLinks.length || deleted.rowCount!==removed.length || deletedItems.rowCount!==removed.length)
        throw new Error('Reference-only rows changed during sync; rolled back.');
    }
    for(const change of changes){
      const w=expected.find(w=>w.item_code===change.code),r=before.find(r=>r.code===change.code);
      const ammo=(await client.query("SELECT id FROM shadowvale.items WHERE content_version_id=$1 AND code=$2 AND type='Ammo'",[version.id,w.ammo_item_code])).rows;
      if(ammo.length!==1)throw new Error('Weapon ammo must resolve to one Ammo item in the same version.');
      const values=Object.keys(numeric).map(k=>w[k]);
      const assignments=Object.values(numeric).map((column,i)=>`${column}=$${i+1}`);
      values.push(pascal(w.weapon_class),ammo[0].id,w.is_suppressed,r.id,version.id);
      assignments.push('class=$9','ammo_item_id=$10','is_suppressed=$11','updated_at=now()');
      const updated=await client.query(`UPDATE shadowvale.weapons w SET ${assignments.join(',')} FROM shadowvale.items i WHERE w.id=$12 AND w.item_id=i.id AND i.content_version_id=$13`,values);
      if(updated.rowCount!==1)throw new Error('Weapon changed during sync; rolled back.');
    }
    const marker=`[unity-source:${catalog.sourceHash}]`;
    const changelog=(version.changelog??'').replace(/\[unity-source:[a-f0-9]{64}\]/g,marker)+`\nWeapon runtime defaults synchronized; author assigned to Designer ${designer}.`+
      (removed.length?` Reference-only definitions removed: ${removed.map(w=>w.code).join(', ')}; generated prototype weapon links cleared for review.`:'');
    const updated=await client.query(`UPDATE shadowvale.content_versions SET authored_by_id=$1,changelog=$2,revision=revision+1,
      bundle=NULL,bundle_checksum=NULL,validation_errors=NULL,validated_at=NULL,submitted_at=NULL,
      reviewed_by_id=NULL,reviewed_at=NULL,review_note=NULL,updated_at=now()
      WHERE id=$3 AND status='Draft' AND revision=$4 RETURNING version_no,status,revision`,[author[0].id,changelog,version.id,revision]);
    if(updated.rowCount!==1 || differences(await readWeapons(version.id)).length)throw new Error('Post-write verification failed; rolled back.');
    if(JSON.stringify(await untouched(version.id))!==unchanged)throw new Error('Other versions/history changed; rolled back.');
    await client.query('COMMIT');transaction=false;
    console.log(JSON.stringify({mode:'committed',...plan,result:updated.rows[0],backup,publishedAndHistoryUnchanged:true,remainingDifferences:0},null,2));
  }
}catch(e){if(transaction)await client.query('ROLLBACK');console.error(JSON.stringify({code:e.code??'SYNC_FAILED',message:e.code?'Database operation failed; transaction rolled back.':e.message}));process.exitCode=1;}
finally{await client.end();}
