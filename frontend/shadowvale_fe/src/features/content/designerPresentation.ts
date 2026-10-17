import type { CollectionKey, ContentRecord } from './types';
import type { FieldDefinition } from './schemaFields';

/** Presentation only: all 14 collections remain in the editor/API model. */
export const contentGroups: readonly (readonly CollectionKey[])[] = [
  ['items', 'weapons', 'consumables'], ['skills'], ['loot_tables', 'loot_table_entries'],
  ['maps', 'map_loot_tables', 'enemy_placements'], ['enemy_types'],
  ['crafting_recipes', 'crafting_recipe_ingredients'], ['quests', 'quest_rewards'],
];

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
