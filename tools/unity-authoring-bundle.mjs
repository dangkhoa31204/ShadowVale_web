// Normalize Unity source data into the existing versioned tables; no second catalog schema is created.
const snake = s => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const round = (n, places = 2) => Number(Number(n).toFixed(places));
export function authoringBundle({ items, content, loot, balance, skills, recipes, quests, graphs, tradeOffers, playable }) {
  const notes = ['Knife balance comes from the Unity prefab and applies to ordinary swings. Special takedowns follow their existing rules.'];
  const activeWeapons = new Set(playable);
  const referenceOnly = new Set(content.weapons.filter(w => !activeWeapons.has(w.id)).map(w => w.id));
  if (referenceOnly.size) notes.push(`Unimplemented weapon definitions are reference-only and excluded from database authoring: ${[...referenceOnly].join(', ')}. Generated enemy links to these definitions are cleared; review prototype enemy metadata before publish.`);
  const melee = content.weapons.find(w => w.id === 'knife');
  const rows = items.filter(i => !referenceOnly.has(i.code)).map(i => ({
    code: i.code, name: i.name, description: null, item_type: i.type === 'questitem' ? 'quest_item' : i.type,
    rarity: (i.loot?.rarity ?? 'common').toLowerCase(), max_stack: i.maxStack ?? (i.type === 'weapon' ? 1 : i.type === 'ammo' ? 99 : 64),
    weight: round(i.weight ?? 0), base_value: i.baseValue ?? 0, icon_key: null,
    stats: i.code === melee?.id ? { melee_cooldown_s: melee.cooldown_seconds } : Object.fromEntries(Object.entries(i.loot ?? {}).filter(([k]) => !['code','type','rarity','baseValue','weight'].includes(k)).map(([k,v]) => [snake(k), v]))
  }));
  const weapons = content.weapons.filter(w => activeWeapons.has(w.id)).map(w => w.class === 'melee' ? {
    item_code: w.id, item_type: 'weapon', weapon_class: 'melee', damage: round(w.damage), fire_rate: w.fire_rate, effective_range: round(w.range),
    magazine_size: null, reload_time_s: null, ammo_item_code: null, ammo_type: 'ammo',
    max_durability: 100, durability_per_use: 0, noise_radius: 0, is_suppressed: false
  } : ({ item_code:w.id,item_type:'weapon',weapon_class:w.class === 'carbine' ? 'rifle' : w.class,
    damage:round(w.damage),fire_rate:round(w.fire_rate),effective_range:round(w.range),magazine_size:w.magazine_size,reload_time_s:round(w.reload_seconds),
    ammo_item_code:w.ammo_type,ammo_type:'ammo',max_durability:w.durability_max,durability_per_use:round(w.durability_per_shot,3),noise_radius:round(w.noise_radius),is_suppressed:w.suppressed }));
  const archetypes = Object.fromEntries(content.enemy_archetypes.map(a => [a.id,a]));
  const enemy = (code,name,archetype,a,hp,boss,weapon,table,extra={}) => ({code,name,archetype,is_boss:boss,max_hp:hp,
    move_speed:round(a.move_speed),vision_range:round(a.vision_range),vision_angle_deg:round(a.vision_angle),hearing_range:round(a.hearing_range),
    accuracy:round(balance.guardAccuracy.closeHit,3),weapon_item_code:activeWeapons.has(weapon)?weapon:null,loot_table_code:table??null,
    fsm_params:{alert_decay_seconds:a.alert_decay_seconds,retreat_hp_threshold:a.retreat_hp_threshold,accuracy:balance.guardAccuracy,...(a.boss?{boss:a.boss}:{}),...extra}});
  const enemies = content.enemy_archetypes.map(a => enemy(a.id,a.display_name,a.id,a,a.max_hp,a.is_boss,a.weapon_id,a.loot_table_id));
  for(const e of loot.enemyTypes) {
    const a = archetypes[e.archetype === 'boss' ? 'boss_commander' : 'grunt'];
    enemies.push(enemy(e.code,e.name,e.archetype,a,e.maxHp,e.boss,e.weapon,e.lootTable,{drop_min:e.dropMin,drop_max:e.dropMax,sidearm:e.sidearm,sidearm_min:e.sidearmMin,sidearm_max:e.sidearmMax}));
  }
  const skillRows = [['shooting','shootingThresholds','recoilMultipliers','reloadMultipliers'],['engineering','engineeringThresholds','repairBonusFractions','fieldRepairCaps'],['stealth','stealthThresholds','takedownMultipliers']]
    .map(([code,thresholds,...effects])=>({code,name:code,skill_type:code,max_level:skills[thresholds].length,xp_curve:skills[thresholds],effects:Object.fromEntries(effects.map(k=>[snake(k),skills[k]]))}));
  const tables = [
    ...content.loot_tables.map(t=>({code:t.id,name:`Tier ${t.tier} loot`,rollsMin:t.rolls,rollsMax:t.rolls,entries:t.entries.map(e=>({...e,item:e.item_id,tier:t.tier}))})),
    ...loot.lootTables
  ];
  const bundle = {version_no:1,label:'Unity source import',schema_version:'1.0',changelog:'Import Unity content into a Draft. Review and validate before publishing.',
    items:rows,weapons,consumables:rows.filter(i=>i.item_type==='consumable').map(i=>({item_code:i.code,item_type:'consumable',heal_hp:i.code==='medkit_small'?Math.round(balance.medkitHeal):0,restore_stamina:0,use_time_s:0,cures:[],extra_effects:{}})),
    skills:skillRows,loot_tables:tables.map(t=>({code:t.code,name:t.name,rolls_min:t.rollsMin,rolls_max:t.rollsMax})),
    loot_table_entries:tables.flatMap(t=>t.entries.map(e=>({loot_table_code:t.code,item_code:e.item,tier:e.tier,weight:round(e.weight,4),min_qty:e.min,max_qty:e.max}))),
    maps:graphs.map(({code,graph},index)=>({code,name:graph.display_name,scene_key:graph.scene_name,is_safe_camp:code==='map01',sort_order:index,
      nav_graph:{nodes:graph.nav_graph_nodes,escape_routes:graph.escape_routes},layout:{player_start_node:graph.player_start_node,
        game_rules:{trade_offers:tradeOffers.filter(o=>o.mapCode===code).map(o=>({gun:o.gun,ammo:o.ammo,rounds:o.rounds})),...(code==='map01'?{
          tier_odds:loot.tierOdds,adaptive:loot.adaptive,repair:loot.repair,logistics:loot.logistics,
          field_crafting:Object.fromEntries(recipes.map(r=>[r.id,{seconds:r.field_seconds??0,max_batch:r.field_max_batch??1}]))
        }: {})}}})),
    map_loot_tables:loot.containers.map(c=>({map_code:'map01',loot_table_code:c.lootTable,container_tag:c.tag})),enemy_types:enemies,enemy_placements:[],
    crafting_recipes:recipes.map(r=>({code:r.id,name:`Craft: ${items.find(i=>i.code===r.output_item_id)?.name??r.output_item_id}`,output_item_code:r.output_item_id,output_quantity:r.output_count,craft_time_s:round(r.craft_seconds),required_skill_code:r.required_skill??null,required_skill_level:r.required_skill_level??0,station:'workbench'})),
    crafting_recipe_ingredients:recipes.flatMap(r=>r.inputs.map(i=>({recipe_code:r.id,item_code:i.item_id,quantity:i.count}))),
    quests:quests.map((q,index)=>({code:q.code,title:q.title,description:`Unity ${q.mapCode} mission reference. The mission state machine remains in Unity.`,is_main:true,sort_order:index,
      objectives:q.objectives.map(o=>({...o,type:o.kind??'stage',target_id:o.id})),prerequisites:[],reward_xp:0})),quest_rewards:[]};
  notes.push('Missing local stack/weight/value uses schema defaults; inspect item metadata before publish. Consumable use times and generic effects are not inferred.',
    'Map game_rules contains trade stock, tier/adaptive/repair/logistics and field crafting in existing maps.layout JSON. No new tables.',
    'Enemy perception uses the corresponding grunt/commander archetype where only loot enemy metadata exists; review before publish.',
    'Quest rows track Unity objectives; publishing quest metadata does not replace the mission state machine.');
  return {bundle,notes};
}
