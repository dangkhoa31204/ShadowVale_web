import Ajv from 'ajv';
import type { ContentBundle, ContentRecord, JsonValue } from './types';
const records = (value: JsonValue | undefined): ContentRecord[] =>
  Array.isArray(value) ? value.filter(v => v && typeof v === 'object' && !Array.isArray(v)) as ContentRecord[] : [];

export function createBundleValidator(schema: object) {
  const validateSchema = new Ajv({ allErrors: true, jsonPointers: true }).compile(schema);
  return (input: unknown): string[] => {
    if (!validateSchema(input)) return (validateSchema.errors || []).map(e => `${e.dataPath || '/'} ${e.message}`);
    const bundle = input as ContentBundle;
    const errors: string[] = [];
    const groups = ['items', 'weapons', 'enemy_archetypes', 'loot_tables', 'craft_recipes', 'quests', 'maps'] as const;
    for (const key of groups) {
      const ids = new Set<JsonValue>();
      bundle[key].forEach((r, i) => {
        if (ids.has(r.id)) errors.push(`/${key}/${i}/id: duplicate id ${r.id}`);
        ids.add(r.id);
      });
    }
    const ids = (key: typeof groups[number]) => new Set(bundle[key].map(r => r.id));
    const itemIds = ids('items'), weaponIds = ids('weapons'), enemyIds = ids('enemy_archetypes');
    const lootIds = ids('loot_tables'), mapIds = ids('maps');
    const ref = (set: Set<JsonValue>, value: JsonValue | undefined, path: string) => {
      if (!set.has(value as JsonValue)) errors.push(`${path}: unknown reference ${String(value)}`);
    };
    bundle.weapons.forEach((r, i) => {
      ref(itemIds, r.ammo_type, `/weapons/${i}/ammo_type`);
      if (!bundle.items.some(item => item.id === r.ammo_type && item.category === 'ammo')) errors.push(`/weapons/${i}/ammo_type must refer to an ammo item`);
    });
    bundle.enemy_archetypes.forEach((r, i) => {
      ref(weaponIds, r.weapon_id, `/enemy_archetypes/${i}/weapon_id`);
      if (r.loot_table_id !== undefined) ref(lootIds, r.loot_table_id, `/enemy_archetypes/${i}/loot_table_id`);
    });
    bundle.loot_tables.forEach((r, i) => records(r.entries).forEach((entry, j) => {
      ref(itemIds, entry.item_id, `/loot_tables/${i}/entries/${j}/item_id`);
      if (Number(entry.min ?? 1) > Number(entry.max ?? 1)) errors.push(`/loot_tables/${i}/entries/${j}: min must be <= max`);
    }));
    bundle.craft_recipes.forEach((r, i) => {
      ref(itemIds, r.output_item_id, `/craft_recipes/${i}/output_item_id`);
      records(r.inputs).forEach((entry, j) => ref(itemIds, entry.item_id, `/craft_recipes/${i}/inputs/${j}/item_id`));
    });
    bundle.maps.forEach((r, i) => {
      const nodes = records(r.nav_graph_nodes);
      const nodeRef = (v: JsonValue, path: string) => {
        if (!Number.isInteger(v) || Number(v) < 0 || Number(v) >= nodes.length) errors.push(`${path}: node is out of range`);
      };
      nodes.forEach((node, j) => {
        if (node.id !== j) errors.push(`/maps/${i}/nav_graph_nodes/${j}/id must equal its array index`);
        (node.neighbors as JsonValue[]).forEach(v => nodeRef(v, `/maps/${i}/nav_graph_nodes/${j}/neighbors`));
      });
      nodeRef(r.player_start_node ?? 0, `/maps/${i}/player_start_node`);
      (r.escape_routes as JsonValue[]).forEach(v => nodeRef(v, `/maps/${i}/escape_routes`));
      if (r.boss_archetype_id) ref(enemyIds, r.boss_archetype_id, `/maps/${i}/boss_archetype_id`);
      records(r.spawn_groups).forEach((spawn, j) => {
        ref(enemyIds, spawn.archetype_id, `/maps/${i}/spawn_groups/${j}/archetype_id`);
        (spawn.start_nodes as JsonValue[] || []).forEach(v => nodeRef(v, `/maps/${i}/spawn_groups/${j}/start_nodes`));
      });
      records(r.loot_placements).forEach((placement, j) => {
        ref(lootIds, placement.loot_table_id, `/maps/${i}/loot_placements/${j}/loot_table_id`);
        nodeRef(placement.node, `/maps/${i}/loot_placements/${j}/node`);
      });
    });
    bundle.quests.forEach((r, i) => {
      if (r.map_id !== undefined) ref(mapIds, r.map_id, `/quests/${i}/map_id`);
      records(r.rewards).forEach((reward, j) => ref(itemIds, reward.item_id, `/quests/${i}/rewards/${j}/item_id`));
      const objectiveIds = new Set<JsonValue>();
      records(r.objectives).forEach((o, j) => {
        const path = `/quests/${i}/objectives/${j}`;
        if (objectiveIds.has(o.id)) errors.push(`${path}/id: duplicate objective id`);
        objectiveIds.add(o.id);
        if (o.type === 'kill_archetype') ref(enemyIds, o.target_id, path + '/target_id');
        if (o.type === 'collect_item') ref(itemIds, o.target_id, path + '/target_id');
        if (o.type === 'escape_map') ref(mapIds, o.target_id ?? r.map_id, path + '/target_id');
        if (o.type === 'reach_node') {
          const map = bundle.maps.find(m => m.id === r.map_id);
          if (!map || !/^\d+$/.test(String(o.target_id)) || Number(o.target_id) >= records(map.nav_graph_nodes).length) errors.push(path + '/target_id: unknown node in quest map');
        }
      });
    });
    return errors;
  };
}
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}';
}
export async function sealBundle(bundle: ContentBundle, publishedAt: string): Promise<ContentBundle> {
  const sealed = { ...structuredClone(bundle), published_at: publishedAt };
  delete sealed.checksum;
  const bytes = new TextEncoder().encode(canonicalJson(sealed));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  sealed.checksum = 'sha256:' + Array.from(new Uint8Array(hash), v => v.toString(16).padStart(2, '0')).join('');
  return sealed;
}
export interface Difference { path: string; before: unknown; after: unknown }
export function compareBundles(before: unknown, after: unknown, path = ''): Difference[] {
  if (canonicalJson(before) === canonicalJson(after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    const a = before as Record<string, unknown>, b = after as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => compareBundles(a[k], b[k], path + '/' + k));
  }
  // Arrays with stable content IDs compare by ID instead of shifting indices.
  if (Array.isArray(before) && Array.isArray(after) && [...before, ...after].every(v => v && typeof v === 'object' && 'id' in v)) {
    const a = new Map(before.map(v => [v.id, v])), b = new Map(after.map(v => [v.id, v]));
    return [...new Set([...a.keys(), ...b.keys()])].flatMap(id => compareBundles(a.get(id), b.get(id), path + '/' + id));
  }
  return [{ path: path || '/', before, after }];
}
