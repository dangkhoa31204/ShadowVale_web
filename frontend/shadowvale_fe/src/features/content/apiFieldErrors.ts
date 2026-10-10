import { problemOf } from '../../services/api/errors';
import { SaveFailure } from './savePlan';
import { fieldKey } from './apiModel';
import type { CollectionKey, ContentBundle } from './types';

/** Associate nested request validation with the exact editor row that produced it. */
export function editorFieldErrors(error: unknown, bundle: ContentBundle): Record<string, string> {
  const out: Record<string, string> = {};
  const failure = error instanceof SaveFailure ? error : null;
  const children: Record<string, [CollectionKey, string]> = {
    weapon: ['weapons', 'item_code'], consumable: ['consumables', 'item_code'],
    entries: ['loot_table_entries', 'loot_table_code'], enemyplacements: ['enemy_placements', 'map_code'],
    loottables: ['map_loot_tables', 'map_code'], ingredients: ['crafting_recipe_ingredients', 'recipe_code'],
    rewards: ['quest_rewards', 'quest_code'],
  };
  for (const [path, messages] of Object.entries(problemOf(error).errors || {})) {
    if (!failure) { out['meta:' + path.toLowerCase()] = messages.join(' '); continue; }
    const parts = path.replace(/^\$\./, '').split('.');
    let collection: CollectionKey = failure.operation.resource;
    let index = bundle[collection].findIndex(row => row.code === failure.operation.code);
    const match = parts[0].match(/^(\w+)(?:\[(\d+)\])?$/);
    const child = match && children[match[1].toLowerCase()];
    if (child) {
      collection = child[0];
      const matching = bundle[collection].map((row, i) => ({ row, i })).filter(({ row }) => row[child[1]] === failure.operation.code);
      index = matching[Number(match[2] || 0)]?.i ?? -1;
      parts.shift();
    }
    const name = parts.at(-1);
    if (index >= 0 && name) {
      const normalized = name[0].toLowerCase() + name.slice(1);
      out[collection + ':' + index + ':' + fieldKey(normalized, collection)] = messages.join(' ');
    }
  }
  return out;
}
