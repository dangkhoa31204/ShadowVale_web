import type { CollectionKey, ContentBundle, ContentRecord, JsonValue } from './types';
import type { FieldDefinition } from './schemaFields';

/** Presentation only: all 14 collections remain in the editor/API model. */
export const contentGroups: readonly (readonly CollectionKey[])[] = [
  ['items', 'weapons', 'consumables'], ['skills'], ['loot_tables', 'loot_table_entries', 'map_loot_tables'],
  ['maps'], ['enemy_types', 'enemy_placements'],
  ['crafting_recipes', 'crafting_recipe_ingredients'], ['quests', 'quest_rewards'],
];

export const ruleTabs = {
  items: { section: 'trade', label: 'Trao đổi' },
  loot_tables: { section: 'loot', label: 'Cân bằng loot' },
  crafting_recipes: { section: 'crafting', label: 'Sửa đồ & chế tạo dã chiến' },
  quests: { section: 'missions', label: 'Điểm nhiệm vụ' },
} as const satisfies Partial<Record<CollectionKey, { section: string; label: string }>>;

export type RuleSection = typeof ruleTabs[keyof typeof ruleTabs]['section'];

export function ruleTab(group: CollectionKey) {
  return Object.hasOwn(ruleTabs, group) ? ruleTabs[group as keyof typeof ruleTabs] : undefined;
}

export function updateDraftMapLayout(bundle: ContentBundle, mapCode: string, layout: JsonValue): ContentBundle {
  return { ...bundle, maps: bundle.maps.map(map => map.code === mapCode ? { ...map, layout } : map) };
}

const hidden: Partial<Record<CollectionKey, readonly string[]>> = {
  consumables: ['restore_stamina', 'cures', 'extra_effects'],
  crafting_recipes: ['required_skill_code', 'required_skill_level', 'station'],
  quests: ['reward_xp', 'prerequisites', 'is_main', 'sort_order'],
  enemy_types: ['accuracy', 'fsm_params'],
};

export function designerFields(collection: CollectionKey, fields: FieldDefinition[]) {
  return fields.filter(field => !hidden[collection]?.includes(field.key));
}

export function designerRecord(collection: CollectionKey, record: ContentRecord): ContentRecord {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !hidden[collection]?.includes(key)));
}

/** Hidden values must survive both form and advanced JSON edits unchanged. */
export function restoreDesignerFields(collection: CollectionKey, current: ContentRecord, edited: ContentRecord): ContentRecord {
  const next = { ...edited };
  for (const key of hidden[collection] || []) {
    if (Object.hasOwn(edited, key) && JSON.stringify(edited[key]) !== JSON.stringify(current[key]))
      throw new Error(key + ' is not available in the current game editor.');
    if (Object.hasOwn(current, key)) next[key] = current[key];
    else delete next[key];
  }
  if (collection === 'items' && next.item_type === 'armor' && current.item_type !== 'armor')
    throw new Error('Armor is not supported in the current game editor.');
  return next;
}
