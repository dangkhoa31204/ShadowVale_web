import { collections, type CollectionKey, type ContentBundle, type JsonValue } from './types';
import type { FieldDefinition } from './schemaFields';
import { relatedSection } from './recordDetails';

/** Presentation only: all 14 collections remain in the editor/API model. */
export const contentGroups: readonly (readonly CollectionKey[])[] = [
  ['items', 'weapons', 'consumables'], ['skills'], ['loot_tables', 'loot_table_entries', 'map_loot_tables'],
  ['maps'], ['enemy_types', 'enemy_placements'],
  ['crafting_recipes', 'crafting_recipe_ingredients'], ['quests', 'quest_rewards'],
];

export const ruleTabs = {
  items: { section: 'trade', label: 'Trade' },
  loot_tables: { section: 'loot', label: 'Loot balance' },
  crafting_recipes: { section: 'crafting', label: 'Field crafting & repairs' },
  quests: { section: 'missions', label: 'Mission points' },
} as const satisfies Partial<Record<CollectionKey, { section: string; label: string }>>;

export type RuleSection = typeof ruleTabs[keyof typeof ruleTabs]['section'];

export function ruleTab(group: CollectionKey) {
  return Object.hasOwn(ruleTabs, group) ? ruleTabs[group as keyof typeof ruleTabs] : undefined;
}

export const contentNavigation = contentGroups.map(group => {
  const key = group[0];
  const collection = collections.find(entry => entry.key === key)!;
  const child = relatedSection(key)?.collection;
  return { ...collection, records: group.filter(entry => entry !== child).map(entry => collections.find(item => item.key === entry)!), rules: ruleTab(key) };
});

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
