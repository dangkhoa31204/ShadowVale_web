import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { baselineProbabilities } from '../sync-unity-catalog.mjs';

test('tier mass falls down to nearest available tier, then goes up if none is lower', () => {
  const entries = [{ tier: 2, weight: 1 }, { tier: 4, weight: 1 }];
  assert.deepEqual(baselineProbabilities(entries, [52, 38, 8, 2]), [0.98, 0.02]);
});
test('weight is normalized within its tier, never across all tiers', () => {
  const entries = [{ tier: 1, weight: 1 }, { tier: 1, weight: 3 }, { tier: 3, weight: 2 }];
  assert.deepEqual(baselineProbabilities(entries, [52, 38, 8, 2]), [0.225, 0.675, 0.1]);
});
test('guaranteed drops do not take random probability mass', () => {
  assert.deepEqual(baselineProbabilities([{ tier: 5, weight: 9 }], [52, 38, 8, 2]), [null]);
  assert.deepEqual(baselineProbabilities([{ tier: 1, weight: 1 }, { tier: 5, weight: 1 }], [52, 38, 8, 2]), [1, null]);
});
test('zero-weight pool uses the first entry like Unity; invalid odds fail', () => {
  assert.deepEqual(baselineProbabilities([{ tier: 2, weight: 0 }, { tier: 2, weight: 0 }], [52, 38, 8, 2]), [1, 0]);
  assert.throws(() => baselineProbabilities([], [0, 0, 0, 0]), /Invalid tier odds/);
});
const catalog = JSON.parse(fs.readFileSync(new URL('../../backend/shadowvale_be/ShadowVale.BLL/Catalog/unity-catalog.json', import.meta.url)));
test('snapshot resolves trades, loot, recipe inputs and objective prerequisites', () => {
  const codes = new Set(catalog.items.map(i => i.code));
  for (const o of catalog.trade.offers) { assert.ok(codes.has(o.gun)); assert.ok(codes.has(o.ammo)); assert.ok(o.price > 0); }
  for (const t of catalog.lootTables) {
    for (const e of t.entries) assert.ok(codes.has(e.item), `${t.code}: ${e.item}`);
    if (t.entries.some(e => e.tier < 5)) assert.ok(Math.abs(t.entries.reduce((s, e) => s + (e.baselineChance ?? 0), 0) - 1) < 1e-12);
  }
  for (const r of catalog.recipes) {
    assert.ok(codes.has(r.output_item_id));
    for (const i of r.inputs) assert.ok(codes.has(i.item_id), `${r.id}: ${i.item_id}`);
  }
  for (const q of catalog.quests) {
    const ids = new Set(q.objectives.map(o => o.id));
    assert.equal(ids.size, q.objectives.length);
    for (const o of q.objectives) for (const id of o.requires) assert.ok(ids.has(id), id);
  }
});
test('scripted knife has no fabricated damage and field crafting preserves bench availability', () => {
  assert.equal(catalog.weapons.find(w => w.id === 'knife').damage, undefined);
  const recipe = catalog.recipes.find(r => r.id === 'assemble_ammo_ak');
  assert.ok(recipe.benchAvailable && recipe.fieldAvailable);
  assert.equal(recipe.field_seconds, 8);
});
test('database assessment covers exactly the mapped application tables', () => {
  const context = fs.readFileSync(new URL('../../backend/shadowvale_be/ShadowVale.DAL/Data/ShadowValeDbContext.cs', import.meta.url), 'utf8');
  const tables = [...context.matchAll(/DbSet<\w+> (\w+) =>/g)].map(m => m[1].replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase());
  assert.deepEqual(catalog.databaseAudit.map(t => t.table).sort(), [...new Set(tables)].sort());
});
