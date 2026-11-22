import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { authoringBundle } from './unity-authoring-bundle.mjs';
import { resolveWeaponRuntime } from './unity-weapon-runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const strings = body => [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse(`"${m[1]}"`));
function block(text, name) {
  const match = text.match(new RegExp(`\\b${name}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!match) throw new Error(`Cannot extract ${name}; update the exporter for the new Unity source format.`);
  return match[1];
}

// Map01LootRoller.Pick: tier selection, nearest lower available tier (else minimum), then weight.
// These are baseline probabilities per random roll, before adaptive boosts, ammo replacement and pity.
export function baselineProbabilities(entries, odds) {
  const tiers = [...new Set(entries.filter(e => e.tier >= 1 && e.tier <= 4).map(e => e.tier))].sort();
  const totalOdds = odds.reduce((a, b) => a + b, 0);
  if (odds.length !== 4 || totalOdds <= 0 || odds.some(n => n < 0)) throw new Error('Invalid tier odds');
  const tierMass = new Map(tiers.map(t => [t, 0]));
  if (tiers.length) odds.forEach((weight, i) => {
    const tier = tiers.includes(i + 1) ? i + 1 : tiers.filter(t => t < i + 1).at(-1) ?? tiers[0];
    tierMass.set(tier, tierMass.get(tier) + weight / totalOdds);
  });
  return entries.map((entry, index) => {
    if (entry.tier === 5) return null; // Guaranteed once per container, not a weighted roll.
    const pool = entries.filter(e => e.tier === entry.tier);
    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    return (tierMass.get(entry.tier) ?? 0) * (total > 0 ? entry.weight / total : entries.indexOf(pool[0]) === index ? 1 : 0);
  });
}

export function buildCatalog(assets) {
  const sources = new Map();
  const read = relative => {
    const bytes = fs.readFileSync(path.join(assets, relative));
    sources.set(relative, { path: relative, sha256: hash(bytes) });
    return bytes.toString('utf8').replace(/^\uFEFF/, '');
  };
  const json = relative => JSON.parse(read(relative));
  let content = json('_Project/Map01/Generated/Map01Content.json');
  const loot = json('_Project/Map01/Resources/Loot/Map01Loot.json');
  const balance = json('_Project/Map01/Map01Balance.json');
  const skills = json('Resources/Skills/SkillBalance.json');
  const chapter = json('_Project/Map01/Resources/Story/Map02Chapter.json');
  const presentation = read('_Project/Map01/Runtime/ForestInventory.cs');
  const names = Object.fromEntries([...presentation.matchAll(/case "([^"]+)": return "([^"]*)";/g)].map(m => [m[1], m[2]]).reverse());
  const playable = strings(presentation.match(/bool IsWeapon[^;]+;/)?.[0] ?? '');
  const inventory = read('_Project/Map01/Runtime/Map01Inventory.cs');
  const field = read('_Project/Map01/Runtime/Map01Inventory.FieldCraft.cs');
  const constants = Object.fromEntries([...field.matchAll(/(\w+)\s*=\s*"([^"]+)"/g)].map(m => [m[1], m[2]]));
  const benchBody = block(inventory, 'BenchRecipes');
  const bench = [...strings(benchBody), ...benchBody.split(',').map(s => constants[s.trim()]).filter(Boolean)];
  const quest = read('_Project/Map01/Runtime/Map01Quest.cs');
  const stageIds = strings(block(quest, 'StageIds'));
  const objectives = strings(block(quest, 'Objectives'));
  if (stageIds.length !== objectives.length || !stageIds.length) throw new Error('Map 1 stage/objective mismatch');
  const m16 = read('_Project/Map01/Runtime/Map01M16.cs');
  const runtimeWeapons = resolveWeaponRuntime(content, read('_Project/Prefabs/Items/W_AK47.prefab'), read('_Project/Prefabs/Player/Player.prefab'), m16);
  content = runtimeWeapons.content;
  const m16Constants = Object.fromEntries([...m16.matchAll(/(\w+)\s*=\s*"([^"]+)"/g)].map(m => [`Map01M16.${m[1]}`, m[2]]));
  const trader = read('_Project/Map01/Runtime/CampTrader.cs');
  for (const source of ['Map01Loot.cs', 'Map01Logistics.cs', 'Map01Inventory.Condition.cs', 'PublishedContent.cs']) read(`_Project/Map01/Runtime/${source}`);
  read('_Project/Scripts/Bootstrap/GameBootstrap.cs');
  read('_Project/Map02/Runtime/Map02Mission.Telemetry.cs');

  const codes = [...new Set([...content.items.map(i => i.id), ...loot.items.map(i => i.code), ...content.weapons.map(w => w.id)])].sort();
  const items = codes.map(code => {
    const c = content.items.find(i => i.id === code), l = loot.items.find(i => i.code === code), w = content.weapons.find(i => i.id === code);
    return { code, name: names[code] ?? c?.display_name ?? w?.display_name ?? code,
      type: c?.category ?? l?.type.toLowerCase() ?? 'weapon', maxStack: c?.stack_max ?? null,
      weight: c?.weight ?? l?.weight ?? null, baseValue: l?.baseValue ?? null,
      inRuntimeInventory: playable.includes(code) || !!l, loot: l ?? null };
  });
  const itemByCode = Object.fromEntries(items.map(i => [i.code, i]));
  const weapons = content.weapons.map(w => ({ ...w, name: itemByCode[w.id].name, playable: playable.includes(w.id) }));
  // Knife is scripted. Preserve absence of numeric stats rather than inventing damage/range.
  for (const code of playable) if (!weapons.some(w => w.id === code)) weapons.push({ id: code, name: names[code] ?? code, playable: true, scripted: true });
  const lootTables = loot.lootTables.map(t => ({ ...t, source: 'runtime', entries: t.entries.map((e, i) => ({ ...e,
    baselineChance: baselineProbabilities(t.entries, loot.tierOdds)[i], guaranteed: e.tier === 5 })) }));
  const recipes = content.craft_recipes.map(r => ({ ...r, benchAvailable: bench.includes(r.id), fieldAvailable: r.field_seconds > 0 }));
  const tradeOffers = [1, 2].flatMap(map => {
    const offers = [...block(trader, `Map${map}Stock`).matchAll(/new Offer\(([^,]+),\s*([^,]+),\s*(\d+)\)/g)];
    if (!offers.length) throw new Error(`No trade offers extracted for map ${map}`);
    const resolve = value => value.trim().startsWith('"') ? JSON.parse(value.trim()) : m16Constants[value.trim()] ?? (() => { throw new Error(`Unknown C# constant ${value}`); })();
    return offers.map(m => {
      const gun = resolve(m[1]), ammo = resolve(m[2]);
      if (!itemByCode[gun] || !itemByCode[ammo]) throw new Error('Trade references an unknown item');
      return { mapCode: `map0${map}`, gun, ammo, rounds: Number(m[3]), price: itemByCode[gun].baseValue };
    });
  });
  const quests = [
    { code: 'map01_main', mapCode: 'map01', title: 'Chiến dịch rừng — Map 1', objectives: stageIds.map((id, index) => ({ id, index, title: objectives[index], requires: [], count: 1, playOrder: index === 9 ? stageIds.length : index })) },
    { code: 'map02_chapter', mapCode: 'map02', title: 'Làng ven sông — Map 2', objectives: chapter.tasks.map((t, index) => ({ ...t, index, playOrder: index, credit: loot.logistics.mapTwoRewards.find(r => r.id === t.id)?.points ?? 0 })) }
  ];
  const graphs = [];
  const maps = [['Map00_Tutorial', 'map00_tutorial'], ['Map 1', 'map01'], ['Map 2', 'map02']].map(([scene, code]) => {
    const g = json(`_Project/Resources/TacticalGraphs/${scene}.nav_graph.json`);
    graphs.push({code,graph:g});
    const nodes = g.nav_graph_nodes;
    return { code, name: g.display_name, scene: g.scene_name, nodeCount: nodes.length,
      bounds: { minX: Math.min(...nodes.map(n => n.x)), maxX: Math.max(...nodes.map(n => n.x)), minZ: Math.min(...nodes.map(n => n.z)), maxZ: Math.max(...nodes.map(n => n.z)) },
      escapeRoutes: g.escape_routes ?? [], spawnGroups: g.spawn_groups ?? [],
      containers: code === 'map01' ? loot.containers : [], fieldCaches: code === 'map01' ? loot.fieldCaches : [],
      objectiveCount: quests.filter(q => q.mapCode === code).reduce((sum, q) => sum + q.objectives.length, 0),
      note: 'Nav graph metadata only; scene geometry, actual spawns and NavMesh remain Unity assets.' };
  });
  const projection = {
    items: items.map(i => ({ code: i.code, ...(i.maxStack == null ? {} : { max_stack: i.maxStack }), ...(i.baseValue == null ? {} : { base_value: i.baseValue }) })),
    weapons: content.weapons.map(w => ({ item_code: w.id, damage: w.damage, fire_rate: w.fire_rate, effective_range: w.range, magazine_size: w.magazine_size, reload_time_s: w.reload_seconds, ammo_item_code: w.ammo_type, max_durability: w.durability_max, durability_per_use: w.durability_per_shot, noise_radius: w.noise_radius, is_suppressed: w.suppressed })),
    loot_tables: loot.lootTables.map(t => ({ code: t.code, rolls_min: t.rollsMin, rolls_max: t.rollsMax })),
    loot_table_entries: loot.lootTables.flatMap(t => t.entries.map(e => ({ loot_table_code: t.code, item_code: e.item, tier: e.tier, weight: e.weight, min_qty: e.min, max_qty: e.max }))),
    crafting_recipes: recipes.map(r => ({ code: r.id, output_item_code: r.output_item_id, output_quantity: r.output_count, craft_time_s: r.craft_seconds })),
    crafting_recipe_ingredients: recipes.flatMap(r => r.inputs.map(i => ({ recipe_code: r.id, item_code: i.item_id, quantity: i.count }))),
    maps: maps.map(m => ({ code: m.code, scene_key: m.scene })),
    map_loot_tables: loot.containers.map(c => ({ map_code: 'map01', container_tag: c.tag, loot_table_code: c.lootTable }))
  };
  let unityCommit = null;
  try { unityCommit = execFileSync('git', ['-C', path.dirname(assets), 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* hashes still identify the source */ }
  const sourceList = [...sources.values()].sort((a, b) => a.path.localeCompare(b.path));
  const imported = authoringBundle({items,content,loot,balance,skills,recipes,quests,graphs,tradeOffers});
  imported.notes.push('Rifle damage/range/fire rate resolve Unity prefab and M16 runtime constants; magazine/reload resolve Player prefab. Generated JSON alone is not the effective rifle configuration. Skills, lethal-hit rules and enemy difficulty modifiers remain runtime behavior.');
  projection.items=projection.items.filter(i=>i.code!=='knife');
  projection.maps=imported.bundle.maps.map(m=>({code:m.code,scene_key:m.scene_key,layout:m.layout}));
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), unityCommit, sourceHash: hash(JSON.stringify(sourceList)), sources: sourceList,
    authoringBundle: imported.bundle, importNotes: imported.notes, weaponRuntimeOverrides: runtimeWeapons.overrides,
    items, weapons, lootTables, recipes, trade: { offers: tradeOffers, materials: loot.logistics.materialTrade, logistics: loot.logistics },
    maps, quests, adaptive: loot.adaptive, tierOdds: loot.tierOdds, repair: loot.repair, balance, skills,
    enemyTypes: loot.enemyTypes, authoringProjection: projection,
    databaseAudit: JSON.parse(fs.readFileSync(path.join(root, 'tools/database-content-audit.json'), 'utf8')),
    limitations: [
      'Snapshot of checked-out Unity sources, not proof of the configuration a running player loaded. Published values can override local defaults at scene load.',
      'Import creates editable database rows. Updated Unity builds apply prices and maps.layout.game_rules for trade, adaptive loot, repair and field crafting after publish. Mission flow and scene geometry remain in Unity.',
      'Loot chance is per random roll before adaptive boosts, guard ammo replacement and medkit pity. Tier 5 entries are guaranteed per container; multiple rolls can repeat items.',
      'Weapon definitions include unused catalog weapons. Playable marks the inventory whitelist; scripted knife stats are intentionally absent.',
      'Tutorial objectives and scene geometry are not exported. Database retention decisions describe the source model; live row counts are recorded separately in the Supabase audit report.'
    ] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const assets = process.argv[process.argv.indexOf('--unity') + 1];
  if (!process.argv.includes('--unity') || !assets) throw new Error('Usage: node tools/sync-unity-catalog.mjs --unity <Unity/Assets> [--check]');
  const output = path.join(root, 'backend/shadowvale_be/ShadowVale.BLL/Catalog/unity-catalog.json');
  const catalog = buildCatalog(path.resolve(assets));
  if (process.argv.includes('--check')) {
    const existing = JSON.parse(fs.readFileSync(output, 'utf8'));
    for (const value of [existing, catalog]) { delete value.generatedAt; delete value.unityCommit; }
    if (JSON.stringify(existing) !== JSON.stringify(catalog)) throw new Error('Unity catalog is stale. Run sync-unity-catalog without --check.');
    console.log('Unity catalog matches source files.');
  } else {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(catalog, null, 2) + '\n');
    console.log(`Exported ${catalog.items.length} items, ${catalog.recipes.length} recipes, ${catalog.quests.reduce((n, q) => n + q.objectives.length, 0)} objectives to ${output}`);
  }
}
