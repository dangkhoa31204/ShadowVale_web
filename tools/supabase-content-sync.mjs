import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

// Opt-in import into ONE NEW Draft. Never updates existing versions, publishes, or drops a table.
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
  application_name:'shadowvale-unity-draft-import'});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'backend/shadowvale_be/ShadowVale.BLL/Catalog/unity-catalog.json')));
const b=catalog.authoringBundle;
const require=createRequire(import.meta.url);
const Ajv=require('../frontend/shadowvale_fe/node_modules/ajv');
const schema=JSON.parse(fs.readFileSync(path.join(root,'backend/shadowvale_be/ShadowVale.BLL/Schemas/content-bundle-1.0.schema.json')));
const validate=new Ajv({allErrors:true,multipleOfPrecision:8}).compile(schema);
if(!validate(b)) throw new Error('Authoring bundle failed schema validation: '+JSON.stringify(validate.errors));
const counts=Object.fromEntries(Object.entries(b).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]));
if(!process.argv.includes('--write')) { console.log(JSON.stringify({mode:'plan',sourceHash:catalog.sourceHash,counts,notes:catalog.importNotes})); process.exit(0); }
const pascal=s=>s.split('_').map(w=>w[0].toUpperCase()+w.slice(1)).join('');
const ids={};
const id=(kind,code)=>{if(!ids[kind]?.has(code))throw new Error(`Missing ${kind} reference: ${code}`);return ids[kind].get(code);};
const json=v=>JSON.stringify(v);
let transaction=false;
try {
  await client.connect();await client.query('BEGIN');transaction=true;
  await client.query("SET LOCAL statement_timeout='30s'");
  await client.query('SELECT pg_advisory_xact_lock(734022611)');
  const marker=`[unity-source:${catalog.sourceHash}]`;
  const existing=(await client.query('SELECT id,version_no,status FROM shadowvale.content_versions WHERE changelog LIKE $1',['%'+marker+'%'])).rows;
  if(existing.length) {await client.query('ROLLBACK');transaction=false;console.log(JSON.stringify({created:false,existing}));}
  else {
    const authors=(await client.query("SELECT id FROM shadowvale.users WHERE is_active AND role='Admin'")).rows;
    if(authors.length!==1)throw new Error('Import requires exactly one active Admin; select an author explicitly before importing into this database.');
    const liveBefore=(await client.query("SELECT id,bundle_checksum,revision FROM shadowvale.content_versions WHERE status='Published'")).rows;
    const versionId=crypto.randomUUID();
    const version=(await client.query("INSERT INTO shadowvale.content_versions (id,label,changelog,status,revision,schema_version,authored_by_id,created_at,updated_at) VALUES ($1,$2,$3,'Draft',1,'1.0',$4,now(),now()) RETURNING id,version_no,status",[versionId,`Unity import ${new Date().toISOString().slice(0,10)}`,marker+'\n'+catalog.importNotes.join('\n'),authors[0].id])).rows[0];
    async function insert(table,data,kind,code) {
      const row={id:crypto.randomUUID(),...data};const columns=Object.keys(row);
      await client.query(`INSERT INTO shadowvale."${table}" (${columns.map(c=>'"'+c+'"').join(',')},created_at,updated_at) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')},now(),now())`,Object.values(row));
      if(kind){ids[kind]??=new Map();if(ids[kind].has(code))throw new Error(`Duplicate ${kind}: ${code}`);ids[kind].set(code,row.id);}
    }
    const parent={content_version_id:versionId};
    for(const i of b.items)await insert('items',{...parent,code:i.code,name:i.name,description:i.description,type:pascal(i.item_type),rarity:pascal(i.rarity),max_stack:i.max_stack,weight:i.weight,base_value:i.base_value,stats:json(i.stats),icon_key:i.icon_key},'items',i.code);
    for(const w of b.weapons)await insert('weapons',{item_id:id('items',w.item_code),class:pascal(w.weapon_class),damage:w.damage,fire_rate:w.fire_rate,effective_range:w.effective_range,magazine_size:w.magazine_size,reload_time_seconds:w.reload_time_s,ammo_item_id:w.ammo_item_code?id('items',w.ammo_item_code):null,max_durability:w.max_durability,durability_per_use:w.durability_per_use,noise_radius:w.noise_radius,is_suppressed:w.is_suppressed},'weapons',w.item_code);
    for(const c of b.consumables)await insert('consumables',{item_id:id('items',c.item_code),heal_hp:c.heal_hp,restore_stamina:c.restore_stamina,use_time_seconds:c.use_time_s,cures:c.cures,extra_effects:json(c.extra_effects)});
    for(const s of b.skills)await insert('skills',{...parent,code:s.code,name:s.name,type:pascal(s.skill_type),max_level:s.max_level,xp_curve:json(s.xp_curve),effects:json(s.effects)},'skills',s.code);
    for(const t of b.loot_tables)await insert('loot_tables',{...parent,code:t.code,name:t.name,rolls_min:t.rolls_min,rolls_max:t.rolls_max},'loot',t.code);
    for(const e of b.loot_table_entries)await insert('loot_table_entries',{loot_table_id:id('loot',e.loot_table_code),item_id:id('items',e.item_code),tier:e.tier,weight:e.weight,min_quantity:e.min_qty,max_quantity:e.max_qty});
    for(const m of b.maps)await insert('maps',{...parent,code:m.code,name:m.name,scene_key:m.scene_key,is_safe_camp:m.is_safe_camp,sort_order:m.sort_order,nav_graph:json(m.nav_graph),layout:json(m.layout)},'maps',m.code);
    for(const m of b.map_loot_tables)await insert('map_loot_tables',{map_id:id('maps',m.map_code),loot_table_id:id('loot',m.loot_table_code),container_tag:m.container_tag});
    for(const e of b.enemy_types)await insert('enemy_types',{...parent,code:e.code,name:e.name,archetype:e.archetype,is_boss:e.is_boss,max_hp:e.max_hp,move_speed:e.move_speed,vision_range:e.vision_range,vision_angle_degrees:e.vision_angle_deg,hearing_range:e.hearing_range,accuracy:e.accuracy,weapon_id:e.weapon_item_code?id('weapons',e.weapon_item_code):null,loot_table_id:e.loot_table_code?id('loot',e.loot_table_code):null,fsm_params:json(e.fsm_params)});
    for(const r of b.crafting_recipes)await insert('crafting_recipes',{...parent,code:r.code,name:r.name,output_item_id:id('items',r.output_item_code),output_quantity:r.output_quantity,craft_time_seconds:r.craft_time_s,required_skill_id:r.required_skill_code?id('skills',r.required_skill_code):null,required_skill_level:r.required_skill_level,station:r.station},'recipes',r.code);
    for(const i of b.crafting_recipe_ingredients)await insert('crafting_recipe_ingredients',{recipe_id:id('recipes',i.recipe_code),item_id:id('items',i.item_code),quantity:i.quantity});
    for(const q of b.quests)await insert('quests',{...parent,code:q.code,title:q.title,description:q.description,is_main:q.is_main,sort_order:q.sort_order,objectives:json(q.objectives),prerequisites:q.prerequisites,reward_xp:q.reward_xp});
    const liveAfter=(await client.query("SELECT id,bundle_checksum,revision FROM shadowvale.content_versions WHERE status='Published'")).rows;
    if(JSON.stringify(liveBefore)!==JSON.stringify(liveAfter))throw new Error('Publication changed during import; rolled back.');
    // Leave validation empty: the normal backend validate/submit/approve/publish workflow remains mandatory.
    await client.query('COMMIT');transaction=false;
    console.log(JSON.stringify({created:true,version,counts,publishedUnchanged:true,validated:false}));
  }
}catch(e){if(transaction)await client.query('ROLLBACK');console.error(JSON.stringify({code:e.code??'IMPORT_FAILED',message:e.code?'Database operation failed; transaction rolled back.':e.message}));process.exitCode=1;}
finally{await client.end();}
