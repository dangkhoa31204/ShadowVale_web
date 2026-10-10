import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyCommand } from '../src/features/content/workflow.ts';
import { createBundleValidator, compareBundles, canonicalJson, sealBundle } from '../src/features/content/validation.ts';
import { createContentRecord, schemaFields } from '../src/features/content/schemaFields.ts';
import { newChangeReport } from '../src/features/changeReports/types.ts';
import { validateChangeReport, validateEvidenceFile } from '../src/features/changeReports/reportValidation.ts';
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
  const bundle = { ...structuredClone(seed), version_no: 2, label: 'Balance pass', changelog: 'Combat tuning' };
  return { storageVersion: 2, activeReleaseId: 'r1', publications: [],
    releases: [{ id: 'r1', version: '1', version_no: 1, label: seed.label, changelog: seed.changelog || '', status: 'published', bundle: structuredClone(seed), publishedAt: '2026-09-18T00:00:00Z', publishedBy: 'Admin', sourceDraftId: 'initial' }],
    drafts: [{ id: 'd1', version_no: 2, label: bundle.label, changelog: bundle.changelog, parent_version_id: 'initial', title: bundle.label, authorId: designer.id, authorName: designer.callsign, status: 'draft', revision: 1, updatedAt: '', bundle, note: '' }],
    users: [{ ...admin, active: true }, { ...designer, active: true }], audit: [],
    config: { reviewRequired: true, telemetryEnabled: true } };
}
const publish = (s: Workspace) => applyCommand(s, { type: 'publishDraft', id: 'd1', revision: s.drafts[0].revision, reason: 'Release for playtesting' }, admin, validate);

test('DB v3 seed passes schema and FK validation; numeric precision and enums are checked', () => {
  assert.deepEqual(validate(seed), []);
  const b = structuredClone(seed); b.weapons[0].damage = 1.001;
  assert.ok(validate(b).some(e => e.includes('damage')));
  b.weapons[0].damage = 24; b.weapons[0].weapon_class = 'laser';
  assert.ok(validate(b).some(e => e.includes('weapon_class')));
});
test('PKs, composite relation keys and item subtype references follow the DB', () => {
  const b = structuredClone(seed); b.items.push(structuredClone(b.items[0]));
  assert.ok(validate(b).some(e => e.includes('duplicate primary key')));
  b.items.pop(); b.loot_table_entries.push(structuredClone(b.loot_table_entries[0]));
  assert.ok(validate(b).some(e => e.includes('duplicate primary key')));
  b.loot_table_entries.pop(); b.weapons[0].ammo_item_code = 'rifle_standard';
  assert.ok(validate(b).some(e => e.includes('must reference ammo')));
  b.weapons[0].ammo_item_code = 'missing_ammo';
  assert.ok(validate(b).some(e => e.includes('unknown reference')));
});
test('safe camp, loot quantity bounds and per-version references are checked', () => {
  const b = structuredClone(seed); b.maps.forEach(m => { m.is_safe_camp = false; });
  assert.ok(validate(b).some(e => e.includes('exactly one')));
  const c = structuredClone(seed); c.loot_table_entries[0].min_qty = 500;
  assert.ok(validate(c).some(e => e.includes('min_qty')));
  const d = structuredClone(seed); d.content_version_id = 'version-1'; d.items[0].content_version_id = 'version-2';
  assert.ok(validate(d).some(e => e.includes('another content version')));
});
test('empty collection forms create DB-shaped default records with filtered FK choices', () => {
  for (const collection of Object.keys(schemaFields) as (keyof typeof schemaFields)[]) {
    const b = structuredClone(seed); b[collection] = [];
    const row = createContentRecord(collection, b);
    if (collection === 'maps') { row.is_safe_camp = true; row.scene_key = 'NewMapScene'; }
    b[collection].push(row);
    // Emptying parent collections can invalidate existing child rows; check the new row itself.
    assert.deepEqual(validate(b).filter(error => error.startsWith('/' + collection + '/0')), [], collection);
    assert.equal(row.created_at, undefined); assert.equal(row.updated_at, undefined);
  }
  const weapon = createContentRecord('weapons', seed);
  assert.equal(weapon.item_type, 'weapon'); assert.equal(weapon.ammo_type, 'ammo');
});
test('role policy and internal redirects deny unauthorized access', async () => {
  assert.equal(can('designer', 'publish'), false); assert.equal(can('analyst', 'author'), false);
  assert.equal(can('admin', 'publish'), true);
  assert.equal(safeRedirect('//evil.test', 'designer'), '/admin/dashboard');
  assert.equal(safeRedirect('/admin\\evil', 'analyst'), '/admin/analytics');
  assert.equal(safeRedirect('/admin/content', 'designer'), '/admin/content');
  await assert.rejects(applyCommand(state(), { type: 'submitDraft', id: 'd1', revision: 1 }, analyst, validate), /role/);
});
test('author submits, admin approves and publish seals an immutable snapshot with one published version', async () => {
  const original = state();
  const submitted = await applyCommand(original, { type: 'submitDraft', id: 'd1', revision: 1 }, designer, validate);
  assert.equal(original.drafts[0].status, 'draft'); assert.equal(submitted.drafts[0].revision, 1);
  await assert.rejects(publish(submitted), /approved/);
  const approved = await applyCommand(submitted, { type: 'reviewDraft', id: 'd1', revision: 1, approve: true, note: 'Looks good' }, admin, validate);
  await assert.rejects(applyCommand(approved, { type: 'saveDraft', id: 'd1', revision: 1, title: 'Mutation', bundle: approved.drafts[0].bundle }, designer, validate), /editable/);
  const published = await publish(approved);
  assert.equal(published.drafts[0].status, 'published'); assert.equal(published.releases.length, 2);
  assert.equal(published.activeReleaseId, 'd1'); assert.equal(published.releases.filter(r => r.status === 'published').length, 1);
  assert.equal(published.releases[1].status, 'archived');
  assert.match(published.releases[0].bundle.checksum!, /^[a-f0-9]{64}$/);
  assert.deepEqual(validate(published.releases[0].bundle), []);
  assert.equal(published.publications[0].action, 'publish'); assert.equal(published.publications[0].previous_version_id, 'initial');
  published.drafts[0].bundle.weapons[0].damage = 999;
  assert.equal(original.drafts[0].bundle.weapons[0].damage, 24);
});
test('admin has dashboard, review and publishing navigation with analytics in the account menu', async () => {
  assert.deepEqual(navigationForRole('admin').map(n => n.path), ['/admin/dashboard', '/admin/reviews', '/admin/releases', '/admin/users']);
  assert.equal(homeForRole('admin'), '/admin/dashboard');
  assert.equal(can('admin', 'overview'), true);
  assert.equal(safeRedirect('/admin/dashboard', 'admin'), '/admin/dashboard');
  for (const permission of ['author'] as const) assert.equal(can('admin', permission), false);
  assert.equal(can('admin', 'analytics'), true); assert.equal(safeRedirect('/admin/analytics', 'admin'), '/admin/analytics');
  assert.equal(can('designer', 'solverEdit'), false); assert.equal(can('designer', 'analyticsExport'), false);
  for (const path of ['/admin/content', '/admin/content/d1']) assert.equal(safeRedirect(path, 'admin'), '/admin/dashboard');
  assert.equal(safeRedirect('/admin/releases', 'admin'), '/admin/releases');
  assert.equal(safeRedirect('/admin/users', 'admin'), '/admin/users');
  assert.equal(safeRedirect('/admin/users', 'designer'), '/admin/dashboard');
  for (const role of ['admin', 'designer', 'analyst'] as const) {
    assert.equal(safeRedirect('/admin/profile', role), '/admin/profile');
    assert.equal(safeRedirect('/admin/change-password', role), '/admin/change-password');
  }
  await assert.rejects(applyCommand(state(), { type: 'createDraft', title: 'Admin draft' }, admin, validate), /role/);
  await assert.rejects(applyCommand(state(), { type: 'submitDraft', id: 'd1', revision: 1 }, admin, validate), /role/);
});
test('stale revisions, invalid bundles and duplicate version numbers are blocked', async () => {
  await assert.rejects(applyCommand(state(), { type: 'submitDraft', id: 'd1', revision: 0 }, designer, validate), /changed/);
  const bad = state(); bad.drafts[0].bundle.weapons[0].damage = 0;
  await assert.rejects(applyCommand(bad, { type: 'submitDraft', id: 'd1', revision: 1 }, designer, validate), /Validation failed/);
  const duplicate = state(); duplicate.drafts[0].status = 'approved'; duplicate.drafts[0].version_no = 1; duplicate.drafts[0].bundle.version_no = 1;
  await assert.rejects(publish(duplicate), /already published/);
});
test('rejected content explicitly returns to draft before editing; only content saves increment revision', async () => {
  const pending = state(); pending.drafts[0].status = 'in_review';
  await assert.rejects(applyCommand(pending, { type: 'reviewDraft', id: 'd1', revision: 1, approve: false, note: '' }, admin, validate), /Explain/);
  const rejected = await applyCommand(pending, { type: 'reviewDraft', id: 'd1', revision: 1, approve: false, note: 'Reduce damage' }, admin, validate);
  assert.equal(rejected.drafts[0].status, 'rejected');
  await assert.rejects(applyCommand(rejected, { type: 'saveDraft', id: 'd1', revision: 1, title: 'Updated', bundle: rejected.drafts[0].bundle }, designer, validate), /Only draft/);
  const resumed = await applyCommand(rejected, { type: 'editRejectedDraft', id: 'd1', revision: 1 }, designer, validate);
  const saved = await applyCommand(resumed, { type: 'saveDraft', id: 'd1', revision: 1, title: 'Updated', changelog: 'Tuned', bundle: resumed.drafts[0].bundle }, designer, validate);
  assert.equal(saved.drafts[0].status, 'draft'); assert.equal(saved.drafts[0].revision, 2);
  assert.equal(saved.drafts[0].reviewedBy, undefined); assert.equal(saved.drafts[0].bundle.label, 'Updated');
});
test('publish and rollback require a reason; rollback selects archived content without rewriting its bundle', async () => {
  const s = state(); s.drafts[0].status = 'approved';
  await assert.rejects(applyCommand(s, { type: 'publishDraft', id: 'd1', revision: 1, reason: ' ' }, admin, validate), /reason/);
  const published = await publish(s);
  await assert.rejects(applyCommand(published, { type: 'restoreRelease', id: 'r1', reason: '' }, admin, validate), /reason/);
  const restored = await applyCommand(published, { type: 'restoreRelease', id: 'r1', reason: ' Regression found ' }, admin, validate);
  assert.equal(restored.activeReleaseId, 'r1'); assert.equal(restored.releases.filter(r => r.status === 'published').length, 1);
  assert.deepEqual(restored.releases[1].bundle, published.releases[1].bundle);
  assert.equal(restored.publications[0].action, 'rollback'); assert.equal(restored.publications[0].reason, 'Regression found');
  const bad = structuredClone(published); bad.releases[1].bundle.weapons[0].ammo_item_code = 'missing';
  await assert.rejects(applyCommand(bad, { type: 'restoreRelease', id: 'r1', reason: 'Test' }, admin, validate), /Validation failed/);
});
test('cloning versions keeps placement identities but allocates the next managed version number', async () => {
  const next = await applyCommand(state(), { type: 'createDraft', title: 'Next pass' }, designer, validate);
  assert.equal(next.drafts[0].version_no, 3); assert.equal(next.drafts[0].parent_version_id, 'initial');
  assert.deepEqual(next.drafts[0].bundle.enemy_placements.map(e => e.id), seed.enemy_placements.map(e => e.id));
  const edited = structuredClone(next.drafts[0].bundle); edited.version_no = 99;
  await assert.rejects(applyCommand(next, { type: 'saveDraft', id: next.drafts[0].id, revision: 0, title: 'Next', bundle: edited }, designer, validate), /managed/);
});
test('account safeguards and canonical checksum remain stable', async () => {
  await assert.rejects(applyCommand(state(), { type: 'deleteUser', id: 'admin' }, admin, validate), /own access/);
  await assert.rejects(applyCommand(state(), { type: 'deleteUser', id: 'admin' }, { ...admin, id: 'admin2' }, validate), /active admin/);
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
  assert.equal((await sealBundle(seed, '2026-10-08T00:00:00Z')).checksum, (await sealBundle(seed, '2026-10-08T00:00:00Z')).checksum);
});
test('review diffs match item_code and composite keys independently of order', () => {
  const b = structuredClone(seed); b.weapons[0].damage = 26; b.weapons.reverse();
  assert.deepEqual(compareBundles(seed, b), [{ path: '/weapons/rifle_standard/damage', before: 24, after: 26 }]);
  const c = structuredClone(seed); const removed = c.quest_rewards.pop()!;
  c.quest_rewards.push({ ...removed, item_code: 'cloth' }); c.quest_rewards.reverse();
  const changes = compareBundles(seed, c);
  assert.ok(changes.some(d => d.path === '/quest_rewards/' + removed.quest_code + ':' + removed.item_code && d.after === undefined));
  assert.ok(changes.some(d => d.path === '/quest_rewards/' + removed.quest_code + ':cloth' && d.before === undefined));
});

function validReport() {
  const report = newChangeReport();
  report.summary = 'Rescue mission and interface update';
  report.source = { kind: 'git', branch: 'feature/rescue-route', commit: 'a'.repeat(40) };
  report.changes[0] = { ...report.changes[0], title: 'Mission tracker', description: 'Show the next checkpoint after rescuing the survivor.', image: { id: 'evidence-1', file_name: 'mission.png', media_type: 'image/png', size_bytes: 5000 } };
  return report;
}
test('change reports validate source references, descriptions and evidence metadata', () => {
  const report = validReport(); assert.deepEqual(validateChangeReport(report), []);
  report.changes[0].description = ' '; assert.ok(validateChangeReport(report).some(error => error.includes('describe')));
  report.changes[0].description = 'Updated'; report.source.commit = 'invalid';
  assert.ok(validateChangeReport(report).some(error => error.includes('commit')));
  assert.ok(validateEvidenceFile({ type: 'image/svg+xml', size: 5000 }));
  assert.ok(validateEvidenceFile({ type: 'image/png', size: 3 * 1024 * 1024 }));
});
test('a report shares the content revision and locks its evidence and descriptions when submitted', async () => {
  const report = validReport(), initial = state();
  const saved = await applyCommand(initial, { type: 'saveDraft', id: 'd1', revision: 1, title: 'Mission update', bundle: initial.drafts[0].bundle, changeReport: report }, designer, validate);
  assert.equal(saved.drafts[0].revision, 2); assert.equal(initial.drafts[0].changeReport, undefined);
  report.changes[0].description = 'Changed after saving';
  assert.notEqual(saved.drafts[0].changeReport!.changes[0].description, report.changes[0].description);
  // A stats-only save must retain the attached report.
  const stats = structuredClone(saved.drafts[0].bundle); stats.weapons[0].damage = 26;
  const resaved = await applyCommand(saved, { type: 'saveDraft', id: 'd1', revision: 2, title: 'Mission update', bundle: stats }, designer, validate);
  assert.equal(resaved.drafts[0].changeReport!.changes[0].image!.id, 'evidence-1');
  const submitted = await applyCommand(resaved, { type: 'submitDraft', id: 'd1', revision: 3 }, designer, validate);
  await assert.rejects(applyCommand(submitted, { type: 'saveDraft', id: 'd1', revision: 3, title: 'Overwrite report', bundle: stats, changeReport: report }, designer, validate), /Only draft/);
  await assert.rejects(applyCommand(resaved, { type: 'saveDraft', id: 'd1', revision: 2, title: 'Stale report', bundle: stats, changeReport: report }, designer, validate), /changed/);
});
test('incomplete reports block submission and approval; publication retains evidence outside runtime JSON', async () => {
  const initial = state(); initial.drafts[0].changeReport = newChangeReport();
  await assert.rejects(applyCommand(initial, { type: 'submitDraft', id: 'd1', revision: 1 }, designer, validate), /Change report/);
  initial.drafts[0].status = 'in_review';
  await assert.rejects(applyCommand(initial, { type: 'reviewDraft', id: 'd1', revision: 1, approve: true, note: '' }, admin, validate), /Change report/);
  initial.drafts[0].changeReport = validReport();
  const approved = await applyCommand(initial, { type: 'reviewDraft', id: 'd1', revision: 1, approve: true, note: 'Checked screenshot and logic' }, admin, validate);
  const published = await publish(approved);
  assert.deepEqual(published.releases[0].changeReport, approved.drafts[0].changeReport);
  assert.equal('changeReport' in published.releases[0].bundle, false);
  published.drafts[0].changeReport!.changes[0].description = 'Edited afterwards';
  assert.notEqual(published.releases[0].changeReport!.changes[0].description, published.drafts[0].changeReport!.changes[0].description);
  assert.deepEqual(validate(published.releases[0].bundle), []);
});
