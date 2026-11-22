export const legacyTestItems = new Set(['test_ammo_pistol','test_ammo_rifle','test_pistol','test_rifle']);
export const legacyTestMaps = new Set(['test_field','test_safe_camp']);
export const emptyLegacyCollections = ['consumables','skills','loot_tables','loot_table_entries','enemy_types','enemy_placements',
  'map_loot_tables','crafting_recipes','crafting_recipe_ingredients','quests','quest_rewards'];

// Removing a published test bundle is explicit maintenance, never normal content authoring.
export function assertLegacyTestBundle(versionNo, value) {
  if(!Number.isInteger(Number(versionNo)) || Number(versionNo)<3 || Number(versionNo)>14)
    throw new Error('Only reviewed legacy test versions #3–#14 may be retired.');
  if(value==null)return;
  const bundle=typeof value==='string'?JSON.parse(value):value;
  if(!bundle || !Array.isArray(bundle.items) || !bundle.items.length ||
    bundle.items.some(i=>!legacyTestItems.has(i.code)))throw new Error('Bundle contains unknown or real items; retirement refused.');
  if(!Array.isArray(bundle.maps) || bundle.maps.some(m=>!legacyTestMaps.has(m.code)))
    throw new Error('Bundle contains unknown or real maps; retirement refused.');
  if(!Array.isArray(bundle.weapons) || bundle.weapons.some(w=>!legacyTestItems.has(w.item_code)))
    throw new Error('Bundle contains unknown or real weapons; retirement refused.');
  for(const key of emptyLegacyCollections)if(bundle[key]!=null&&(!Array.isArray(bundle[key])||bundle[key].length))
    throw new Error(`Bundle contains non-test ${key}; retirement refused.`);
}
