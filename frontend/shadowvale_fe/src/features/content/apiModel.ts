import { storageService } from '../../services/storage/storageService';
import { collections, type ContentBundle, type ContentRecord, type CollectionKey, type JsonValue, type Draft } from './types';
import { schemaFields, collectionIdentity, type FieldDefinition } from './schemaFields';
import type { ContentVersionDto, EnumsDto } from '../../services/api/contracts';
import contract from '../../services/api/contract-schema.json';
export type Entity = { id: string; code: string; [key: string]: JsonValue };
export const resources = [
  ['items', 'items', 'Item'], ['skills', 'skills', 'Skill'], ['loot_tables', 'loot-tables', 'LootTable'],
  ['enemy_types', 'enemy-types', 'EnemyType'], ['maps', 'maps', 'Map'],
  ['crafting_recipes', 'recipes', 'CraftingRecipe'], ['quests', 'quests', 'Quest'],
] as const;
export type EntitySet = Record<typeof resources[number][0], Entity[]>;
export const snake = (key: string) => key.replace(/[A-Z]/g, c => '_' + c.toLowerCase()).replace(/^_/, '');
const aliases: Record<string, string> = { type: 'item_type', class: 'weapon_class', reloadTimeSeconds: 'reload_time_s', useTimeSeconds: 'use_time_s', visionAngleDegrees: 'vision_angle_deg', facingDegrees: 'facing_deg', craftTimeSeconds: 'craft_time_s', minQuantity: 'min_qty', maxQuantity: 'max_qty' };
const enumFields = new Set(['item_type','rarity','weapon_class','skill_type']);
export const uiEnum = (value: string) => snake(value);
export function apiEnum(value: JsonValue) { return String(value).split('_').map(s => s[0]?.toUpperCase() + s.slice(1)).join(''); }
export function fieldKey(key: string, collection: CollectionKey) { return key === 'type' && collection === 'skills' ? 'skill_type' : aliases[key] || snake(key); }
export function emptyBundle(version?: ContentVersionDto): ContentBundle {
  return { version_no: Number(version?.versionNo || 0), label: version?.label || '', schema_version: version?.schemaVersion || '1.0', changelog: version?.changelog || '', content_version_id: version?.id, ...Object.fromEntries(collections.map(c => [c.key, []])) } as ContentBundle;
}
function flatten(dto: Record<string, JsonValue>, collection: CollectionKey): ContentRecord {
  const row: ContentRecord = {};
  for (const [k,v] of Object.entries(dto)) {
    if (['weapon','consumable','entries','enemyPlacements','lootTables','ingredients','rewards','enemyCount','lootTableCount'].includes(k)) continue;
    const key = k === 'id' ? 'api_id' : fieldKey(k, collection);
    row[key] = enumFields.has(key) && typeof v === 'string' ? uiEnum(v) : schemaFields[collection].find(f => f.key === key)?.type === 'number' && v !== null ? Number(v) : v;
  }
  return row;
}
function children(value: JsonValue): Record<string, JsonValue>[] { return Array.isArray(value) ? value as Record<string, JsonValue>[] : []; }
export function entitiesToEditor(version: ContentVersionDto, entities: EntitySet): ContentBundle {
  const b = emptyBundle(version);
  for (const [key] of resources) b[key] = entities[key].map(dto => flatten(dto,key));
  for (const item of entities.items) {
    if (item.weapon && typeof item.weapon === 'object') b.weapons.push({ ...flatten(item.weapon as ContentRecord,'weapons'), item_code: item.code, item_type: 'weapon', ammo_type: 'ammo' });
    if (item.consumable && typeof item.consumable === 'object') b.consumables.push({ ...flatten(item.consumable as ContentRecord,'consumables'), item_code: item.code, item_type: 'consumable' });
  }
  for (const table of entities.loot_tables) b.loot_table_entries.push(...children(table.entries).map(r => ({ ...flatten(r,'loot_table_entries'), loot_table_code: table.code })));
  for (const map of entities.maps) {
    b.enemy_placements.push(...children(map.enemyPlacements).map((r,i) => ({ ...flatten(r,'enemy_placements'), id: map.code + ':' + i, map_code: map.code })));
    b.map_loot_tables.push(...children(map.lootTables).map(r => ({ ...flatten(r,'map_loot_tables'), map_code: map.code })));
  }
  for (const recipe of entities.crafting_recipes) b.crafting_recipe_ingredients.push(...children(recipe.ingredients).map(r => ({ ...flatten(r,'crafting_recipe_ingredients'), recipe_code: recipe.code })));
  for (const quest of entities.quests) b.quest_rewards.push(...children(quest.rewards).map(r => ({ ...flatten(r,'quest_rewards'), quest_code: quest.code })));
  return b;
}
type Property = { type?: string | string[]; minimum?: number; maximum?: number; maxLength?: number; pattern?: string };
type Schema = { properties?: Record<string,Property>; required?: string[] };
function requestSchema(name: string) { return (contract as Record<string, Schema>)[name]; }
const childSchemas: Record<string,string> = { weapons:'WeaponRequest', consumables:'ConsumableRequest', loot_table_entries:'LootEntryRequest', enemy_placements:'EnemyPlacementRequest', map_loot_tables:'MapLootTableRequest', crafting_recipe_ingredients:'IngredientRequest', quest_rewards:'QuestRewardRequest' };
export function apiFields(collection: CollectionKey, enums?: EnumsDto): FieldDefinition[] {
  const resource = resources.find(r => r[0] === collection);
  const schema = requestSchema(resource ? 'Create' + resource[2] + 'Request' : childSchemas[collection]);
  const props = schema?.properties || {};
  const mapping = Object.fromEntries(Object.keys(props).map(k => [fieldKey(k,collection),k]));
  const extras = new Set(['item_code','map_code','loot_table_code','recipe_code','quest_code','id']);
  const enumsByField = { item_type:enums?.itemTypes, rarity:enums?.itemRarities, weapon_class:enums?.weaponClasses, skill_type:enums?.skillTypes } as Record<string,string[]|undefined>;
  return schemaFields[collection].filter(f => mapping[f.key] || extras.has(f.key)).map(f => {
    const p = props[mapping[f.key]];
    const options = enumsByField[f.key]?.map(uiEnum);
    return { ...f, ...(options ? { options } : {}), ...(p?.minimum !== undefined ? { min:p.minimum } : {}), ...(p?.maximum !== undefined ? { max:p.maximum } : {}), ...(p?.pattern ? { pattern:p.pattern } : {}), ...(p?.maxLength ? { maxLength:p.maxLength } : {}) };
  });
}
function unflatten(row: ContentRecord, collection: CollectionKey, schemaName: string): ContentRecord {
  const payload: ContentRecord = {};
  for (const key of Object.keys(requestSchema(schemaName)?.properties || {})) {
    if (['code','weapon','consumable','entries','enemyPlacements','lootTables','ingredients','rewards'].includes(key)) continue;
    const flat = fieldKey(key,collection);
    const field = apiFields(collection).find(f => f.key === flat);
    const value = row[flat] ?? field?.defaultValue ?? null;
    payload[key] = enumFields.has(flat) && value !== null ? apiEnum(value) : value;
  }
  return payload;
}
export function editorToEntities(b: ContentBundle): EntitySet {
  const out = {} as EntitySet;
  for (const [key,,name] of resources) out[key] = b[key].map(row => ({ ...unflatten(row,key,'Save'+name+'Request'), id:String(row.api_id || ''), code:String(row.code) }));
  for (const item of out.items) {
    const weapon = b.weapons.find(r => r.item_code === item.code), consumable = b.consumables.find(r => r.item_code === item.code);
    item.weapon = weapon ? unflatten(weapon,'weapons','WeaponRequest') : null;
    item.consumable = consumable ? unflatten(consumable,'consumables','ConsumableRequest') : null;
  }
  for (const table of out.loot_tables) table.entries = b.loot_table_entries.filter(r => r.loot_table_code === table.code).map(r => unflatten(r,'loot_table_entries','LootEntryRequest'));
  for (const map of out.maps) {
    map.enemyPlacements = b.enemy_placements.filter(r => r.map_code === map.code).map(r => unflatten(r,'enemy_placements','EnemyPlacementRequest'));
    map.lootTables = b.map_loot_tables.filter(r => r.map_code === map.code).map(r => unflatten(r,'map_loot_tables','MapLootTableRequest'));
  }
  for (const recipe of out.crafting_recipes) recipe.ingredients = b.crafting_recipe_ingredients.filter(r => r.recipe_code === recipe.code).map(r => unflatten(r,'crafting_recipe_ingredients','IngredientRequest'));
  for (const quest of out.quests) quest.rewards = b.quest_rewards.filter(r => r.quest_code === quest.code).map(r => unflatten(r,'quest_rewards','QuestRewardRequest'));
  return out;
}
export function validateEditor(b: ContentBundle): string[] {
  const issues: string[] = [];
  for (const c of collections) {
    if (!Array.isArray(b[c.key])) { issues.push(c.label+': expected a list.'); continue; }
    const identities = new Set<string>();
    for (const [index,row] of b[c.key].entries()) {
      const identity = collectionIdentity[c.key].map(k => String(row[k])).join(':');
      if (identities.has(identity)) issues.push(c.label + ': duplicate ' + identity);
      identities.add(identity);
      for (const f of apiFields(c.key)) {
      if (f.readOnly) continue;
      const v = row[f.key], path = c.label+' ['+(row.code || index+1)+'] · '+f.label;
      if ((v === undefined || v === null || v === '') && f.required && !f.nullable) issues.push(path+': required.');
      else if (typeof v === 'number' && (!Number.isFinite(v) || (f.min !== undefined && v < f.min) || (f.max !== undefined && v > f.max))) issues.push(path+': outside API limits.');
      else if (f.pattern && typeof v === 'string' && !new RegExp(f.pattern).test(v)) issues.push(path+': invalid format.');
      else if (f.options && v != null && !f.options.includes(String(v))) issues.push(path+': invalid value.');
      else if (f.type === 'number' && v != null && (typeof v !== 'number' || f.step === 1 && !Number.isInteger(v))) issues.push(path+': invalid number.');
      else if (f.reference && v != null && v !== '') {
        const refs = Array.isArray(v) ? v : [v];
        for (const ref of refs) if (!b[f.reference.collection]?.some(r => r[f.reference!.valueField || 'code'] === ref && (!f.reference!.filter || r[f.reference!.filter.field] === f.reference!.filter.value))) issues.push(path+': missing reference '+String(ref));
      }
      else if (f.type === 'json' && v != null && (f.jsonType === 'array' ? !Array.isArray(v) : typeof v !== 'object' || Array.isArray(v))) issues.push(path+': expected '+f.jsonType+'.');
      const resource = resources.find(r => r[0] === c.key);
      const schema = requestSchema(resource ? 'Create'+resource[2]+'Request' : childSchemas[c.key]);
      const property = Object.entries(schema?.properties || {}).find(([k]) => fieldKey(k,c.key) === f.key)?.[1];
      if (property?.maxLength && typeof v === 'string' && v.length > property.maxLength) issues.push(path+': maximum '+property.maxLength+' characters.');
      }
    }
  }
  return issues;
}
export function draftFromApi(v: ContentVersionDto, bundle = emptyBundle(v)): Draft {
  return { id:v.id, version_no:Number(v.versionNo), label:v.label, title:v.label, changelog:v.changelog||'', parent_version_id:v.parentVersionId||undefined,
    status:uiEnum(v.status) as Draft['status'], revision:Number(v.revision), authorId:v.authoredById, authorName:v.authoredById===storageService.getUser()?.id ? storageService.getUser()!.callsign : v.authoredById,
    updatedAt:v.updatedAt, created_at:v.createdAt, bundle, note:v.reviewNote||'', submitted_at:v.submittedAt||undefined,
    reviewedBy:v.reviewedById||undefined, reviewedAt:v.reviewedAt||undefined, validation_errors:v.validationErrors?.map(e=>e.path+': '+e.message),
    validated_at:v.validatedAt||undefined, bundle_checksum:v.bundleChecksum||undefined, published_by:v.publishedById||undefined, published_at:v.publishedAt||undefined };
}

/** Imported editor identities belong to the current version, never another version. */
export function rebindEditorImport(imported: ContentBundle, current: ContentBundle): ContentBundle {
  const next = structuredClone(imported);
  for (const [key] of resources) for (const row of next[key]) {
    delete row.api_id;
    const existing = current[key].find(r => r.code === row.code);
    if (existing?.api_id) row.api_id = existing.api_id;
  }
  return next;
}
