import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Ajv=require('../../frontend/shadowvale_fe/node_modules/ajv');
const catalog=JSON.parse(fs.readFileSync(new URL('../../backend/shadowvale_be/ShadowVale.BLL/Catalog/unity-catalog.json',import.meta.url)));
const b=catalog.authoringBundle;
const schema=JSON.parse(fs.readFileSync(new URL('../../backend/shadowvale_be/ShadowVale.BLL/Schemas/content-bundle-1.0.schema.json',import.meta.url)));
const rulesSchema=JSON.parse(fs.readFileSync(new URL('../../backend/shadowvale_be/ShadowVale.BLL/Schemas/game-rules.schema.json',import.meta.url)));
const statsSchema=JSON.parse(fs.readFileSync(new URL('../../backend/shadowvale_be/ShadowVale.BLL/Schemas/loot-item-stats.schema.json',import.meta.url)));
const ajv=new Ajv({allErrors:true,multipleOfPrecision:8});
test('importable Unity bundle fits existing schema without inventing knife stats',()=>{
  const validate=ajv.compile(schema);assert.ok(validate(b),JSON.stringify(validate.errors));
  assert.ok(!b.items.some(i=>i.code==='knife'));assert.ok(b.weapons.some(w=>w.item_code==='rifle_m16'));
});
test('database authoring includes implemented guns only; legacy shotgun SMG and carbine remain reference-only',()=>{
  const active=catalog.weapons.filter(w=>w.playable&&!w.scripted).map(w=>w.id).sort();
  assert.deepEqual(b.weapons.map(w=>w.item_code).sort(),active);
  for(const code of ['shotgun_pump','smg_compact','carbine_scout']){
    assert.equal(catalog.weapons.find(w=>w.id===code).playable,false);
    assert.ok(!b.items.some(i=>i.code===code));assert.ok(!b.weapons.some(w=>w.item_code===code));
    assert.ok(!b.enemy_types.some(e=>e.weapon_item_code===code));
  }
  for(const e of b.enemy_types)if(e.weapon_item_code)assert.ok(active.includes(e.weapon_item_code));
});
test('every normalized relation resolves inside the imported version',()=>{
  const codes=key=>new Set(b[key].map(r=>r.code));
  const items=codes('items'),loot=codes('loot_tables'),maps=codes('maps'),recipes=codes('crafting_recipes');
  for(const w of b.weapons){assert.ok(items.has(w.item_code));assert.ok(items.has(w.ammo_item_code));}
  for(const e of b.loot_table_entries){assert.ok(loot.has(e.loot_table_code));assert.ok(items.has(e.item_code));}
  for(const i of b.crafting_recipe_ingredients){assert.ok(recipes.has(i.recipe_code));assert.ok(items.has(i.item_code));}
  for(const m of b.map_loot_tables){assert.ok(maps.has(m.map_code));assert.ok(loot.has(m.loot_table_code));}
});
test('map rules preserve source stock and field crafting while bench remains available',()=>{
  const validate=ajv.compile(rulesSchema);
  for(const m of b.maps)assert.ok(validate(m.layout.game_rules),JSON.stringify(validate.errors));
  const map=b.maps.find(m=>m.code==='map01');
  assert.equal(map.layout.game_rules.field_crafting.assemble_ammo_ak.seconds,8);
  assert.equal(b.crafting_recipes.find(r=>r.code==='assemble_ammo_ak').station,'workbench');
  assert.deepEqual(b.maps.find(m=>m.code==='map02').layout.game_rules.trade_offers.map(o=>o.gun),['rifle_standard','rifle_m16']);
});
test('game rules reject invalid probabilities, fractional rounds and negative trade credit',()=>{
  const validate=ajv.compile(rulesSchema);
  for(const bad of [{tier_odds:[1,2,3]},{trade_offers:[{gun:'rifle_m16',ammo:'ammo_556',rounds:1.5}]},{logistics:{materialTrade:[{id:'cloth',points:-1}]}},{field_crafting:{recipe:{seconds:-1,max_batch:0}}}])assert.equal(validate(bad),false);
});
test('loot metadata is numeric and compatible with the Unity consumer',()=>{
  const validate=ajv.compile(statsSchema);
  for(const i of b.items)assert.ok(validate(i.stats),JSON.stringify(validate.errors));
  assert.equal(validate({found_min:'invalid'}),false);
  assert.equal(validate({salvage:[{item:'cloth',min:-1,max:3}]}),false);
});
