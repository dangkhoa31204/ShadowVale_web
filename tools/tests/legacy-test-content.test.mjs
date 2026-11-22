import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertLegacyTestBundle } from '../legacy-test-content.mjs';
const sample=()=>({items:[{code:'test_pistol'},{code:'test_ammo_pistol'}],maps:[{code:'test_field'}],weapons:[{item_code:'test_pistol'}],quests:[]});
test('legacy test snapshots can be identified without relying on their labels',()=>{
  assert.doesNotThrow(()=>assertLegacyTestBundle(9,sample()));
  assert.doesNotThrow(()=>assertLegacyTestBundle(4,JSON.stringify(sample())));
  assert.doesNotThrow(()=>assertLegacyTestBundle(3,null));
});
test('real or mixed game items/maps/weapons cannot be retired as test content',()=>{
  for(const [key,row] of [['items',{code:'rifle_standard'}],['maps',{code:'map01'}],['weapons',{item_code:'rifle_m16'}]]){
    const bundle=sample();bundle[key].push(row);assert.throws(()=>assertLegacyTestBundle(9,bundle),/refused/);
  }
});
test('non-test nested content and newer game versions are protected',()=>{
  const bundle=sample();bundle.quests=[{code:'map01_main'}];assert.throws(()=>assertLegacyTestBundle(9,bundle),/non-test quests/);
  for(const no of [1,2,15,16,NaN])assert.throws(()=>assertLegacyTestBundle(no,null),/legacy test versions/);
  assert.throws(()=>assertLegacyTestBundle(9,{}),/refused/);
});
