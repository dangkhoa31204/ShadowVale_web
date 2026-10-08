import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyCommand } from '../src/features/content/workflow.ts';
import { createBundleValidator, compareBundles, canonicalJson, sealBundle } from '../src/features/content/validation.ts';
import { can, homeForRole, navigationForRole, safeRedirect } from '../src/features/auth/access.ts';
import type { ContentBundle, Workspace } from '../src/features/content/types.ts';
import type { User } from '../src/types/user.ts';
const schema = JSON.parse(readFileSync(new URL('../src/features/content/contracts/content.schema.json', import.meta.url), 'utf8'));
const seed = JSON.parse(readFileSync(new URL('../src/features/content/contracts/demo-bundle.json', import.meta.url), 'utf8')) as ContentBundle;
const validate = createBundleValidator(schema);
const designer: User = { id: 'designer', callsign: 'Designer', email: 'd@sv.dev', role: 'designer', tier: 'internal', clearanceLevel: 'designer', createdAt: '' };
const admin: User = { ...designer, id: 'admin', callsign: 'Admin', role: 'admin' };
const analyst: User = { ...designer, id: 'analyst', role: 'analyst' };
function state(): Workspace {
  return { storageVersion: 1, activeReleaseId: 'r1',
    releases: [{ id: 'r1', version: '1.0.0', bundle: structuredClone(seed), publishedAt: '2026-09-18T00:00:00Z', publishedBy: 'Admin', sourceDraftId: 'initial' }],
    drafts: [{ id: 'd1', title: 'Balance pass', authorId: designer.id, authorName: designer.callsign, status: 'draft', revision: 1, updatedAt: '', bundle: { ...structuredClone(seed), bundle_version: '1.1.0' }, note: '' }],
    users: [{ ...admin, active: true }, { ...designer, active: true }], audit: [],
    config: { reviewRequired: true, telemetryEnabled: true } };
}
test('Unity seed passes full schema and references', () => assert.deepEqual(validate(seed), []));
test('schema rejects invalid numeric stats, duplicate IDs and missing references', () => {
  const b = structuredClone(seed); b.weapons[0].damage = -1;
  assert.ok(validate(b).some(e => e.includes('damage')));
  b.weapons[0].damage = 24; b.weapons[0].ammo_type = 'missing_ammo'; b.items.push(structuredClone(b.items[0]));
  assert.ok(validate(b).some(e => e.includes('duplicate')));
  assert.ok(validate(b).some(e => e.includes('unknown reference')));
});
test('navigation graph nodes, quest objectives and loot bounds are validated', () => {
  const b = structuredClone(seed);
  (b.maps[0].nav_graph_nodes as { id: number }[])[0].id = 50;
  assert.ok(validate(b).some(e => e.includes('array index')));
  const c = structuredClone(seed);
  (c.loot_tables[0].entries as { min: number; max: number }[])[0].min = 500;
  assert.ok(validate(c).some(e => e.includes('min must')));
});
test('role policy and internal redirects deny unauthorized access', async () => {
  assert.equal(can('designer', 'publish'), false); assert.equal(can('analyst', 'author'), false);
  assert.equal(can('admin', 'publish'), true);
  assert.equal(safeRedirect('//evil.test', 'designer'), '/admin/dashboard');
  assert.equal(safeRedirect('/admin\\evil', 'analyst'), '/admin/analytics');
  assert.equal(safeRedirect('/admin/content', 'designer'), '/admin/content');
  await assert.rejects(applyCommand(state(), { type: 'submitDraft', id: 'd1', revision: 1 }, analyst, validate), /role/);
});
test('author submits, admin approves, publishing seals an immutable snapshot', async () => {
  const original = state();
  const submitted = await applyCommand(original, { type: 'submitDraft', id: 'd1', revision: 1 }, designer, validate);
  assert.equal(original.drafts[0].status, 'draft');
  await assert.rejects(applyCommand(submitted, { type: 'publishDraft', id: 'd1', revision: 2 }, admin, validate), /approved/);
  const approved = await applyCommand(submitted, { type: 'reviewDraft', id: 'd1', revision: 2, approve: true, note: 'Looks good' }, admin, validate);
  await assert.rejects(applyCommand(approved, { type: 'saveDraft', id: 'd1', revision: 3, title: 'Mutation', bundle: seed }, designer, validate), /editable/);
  const published = await applyCommand(approved, { type: 'publishDraft', id: 'd1', revision: 3 }, admin, validate);
  assert.equal(published.drafts[0].status, 'published'); assert.equal(published.releases.length, 2);
  assert.equal(published.activeReleaseId, published.releases[0].id);
  assert.match(published.releases[0].bundle.checksum!, /^sha256:[a-f0-9]{64}$/);
  assert.equal(published.audit.length, 3); assert.deepEqual(validate(published.releases[0].bundle), []);
});
test('admin has only review and publishing navigation, without inherited authoring or analytics', async () => {
  assert.deepEqual(navigationForRole('admin').map(n => n.path), ['/admin/reviews', '/admin/releases']);
  assert.equal(homeForRole('admin'), '/admin/reviews');
  for (const permission of ['author', 'analytics', 'overview'] as const) assert.equal(can('admin', permission), false);
  for (const path of ['/admin/content', '/admin/content/d1', '/admin/analytics', '/admin/dashboard', '/admin/users']) assert.equal(safeRedirect(path, 'admin'), '/admin/reviews');
  assert.equal(safeRedirect('/admin/releases', 'admin'), '/admin/releases');
  await assert.rejects(applyCommand(state(), { type: 'createDraft', title: 'Admin draft' }, admin, validate), /role/);
  await assert.rejects(applyCommand(state(), { type: 'saveDraft', id: 'd1', revision: 1, title: 'Admin edit', bundle: seed }, admin, validate), /role/);
  await assert.rejects(applyCommand(state(), { type: 'submitDraft', id: 'd1', revision: 1 }, admin, validate), /role/);
});
test('stale revisions, invalid bundles and duplicate release versions are blocked', async () => {
  await assert.rejects(applyCommand(state(), { type: 'submitDraft', id: 'd1', revision: 0 }, designer, validate), /changed/);
  const bad = state(); bad.drafts[0].bundle.weapons[0].damage = 0;
  await assert.rejects(applyCommand(bad, { type: 'submitDraft', id: 'd1', revision: 1 }, designer, validate), /Validation failed/);
  const duplicate = state(); duplicate.drafts[0].status = 'approved'; duplicate.drafts[0].bundle.bundle_version = '1.0.0';
  await assert.rejects(applyCommand(duplicate, { type: 'publishDraft', id: 'd1', revision: 1 }, admin, validate), /already published/);
});
test('requested changes require feedback and resubmission resets approval', async () => {
  const pending = state(); pending.drafts[0].status = 'in_review';
  await assert.rejects(applyCommand(pending, { type: 'reviewDraft', id: 'd1', revision: 1, approve: false, note: '' }, admin, validate), /Explain/);
  const returned = await applyCommand(pending, { type: 'reviewDraft', id: 'd1', revision: 1, approve: false, note: 'Reduce damage' }, admin, validate);
  const saved = await applyCommand(returned, { type: 'saveDraft', id: 'd1', revision: 2, title: 'Updated', bundle: returned.drafts[0].bundle }, designer, validate);
  assert.equal(saved.drafts[0].status, 'draft'); assert.equal(saved.drafts[0].reviewedBy, undefined);
});
test('restore validates the selected release and records the active version change', async () => {
  const s = state(); const restored = await applyCommand(s, { type: 'restoreRelease', id: 'r1' }, admin, validate);
  assert.equal(restored.activeReleaseId, 'r1'); assert.equal(restored.audit[0].action, 'restoreRelease');
  s.releases[0].bundle.weapons[0].ammo_type = 'missing';
  await assert.rejects(applyCommand(s, { type: 'restoreRelease', id: 'r1' }, admin, validate), /Validation failed/);
});
test('account mutations prevent self-removal and retain an active administrator', async () => {
  await assert.rejects(applyCommand(state(), { type: 'deleteUser', id: 'admin' }, admin, validate), /own access/);
  await assert.rejects(applyCommand(state(), { type: 'deleteUser', id: 'admin' }, { ...admin, id: 'admin2' }, validate), /active admin/);
});
test('canonical checksum and content differences are stable under object key reordering', async () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
  const b = structuredClone(seed); b.weapons[0].damage = 26;
  assert.ok(compareBundles(seed, b).some(d => d.path === '/weapons/rifle_standard/damage' && d.before === 24 && d.after === 26));
  assert.equal((await sealBundle(seed, '2026-10-08T00:00:00Z')).checksum, (await sealBundle(seed, '2026-10-08T00:00:00Z')).checksum);
});
test('review diffs identify added, removed and nested changed content independently of record order', () => {
  const b = structuredClone(seed);
  const removed = b.weapons.pop()!;
  const added = { ...b.weapons[0], id: 'new_rifle' };
  b.weapons.push(added); b.weapons.reverse();
  b.ai_settings.solver_mode = 'experimental';
  const changes = compareBundles(seed, b);
  assert.ok(changes.some(d => d.path === '/weapons/' + removed.id && d.after === undefined));
  assert.ok(changes.some(d => d.path === '/weapons/new_rifle' && d.before === undefined));
  assert.ok(changes.some(d => d.path === '/ai_settings/solver_mode' && d.after === 'experimental'));
  assert.equal(changes.filter(d => d.path.startsWith('/weapons/')).length, 2);
});
