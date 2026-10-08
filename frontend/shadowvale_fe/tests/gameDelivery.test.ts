import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDemoDelivery, reviewDemoBuild, publishDemoBuild } from '../src/features/gameDelivery/demoGameDelivery.ts';
import { canonicalJson, sealBundle } from '../src/features/content/validation.ts';
import type { ContentBundle } from '../src/features/content/types.ts';
import type { DeliveryState, GameBuild } from '../src/features/gameDelivery/types.ts';

const seed = JSON.parse(readFileSync(new URL('../src/features/content/contracts/demo-bundle.json', import.meta.url), 'utf8')) as ContentBundle;
const buildIn = (state: DeliveryState, id = 'demo-ready'): GameBuild => state.builds.find(b => b.id === id)!;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

test('demo review then publication preserves source snapshots and seals the chosen game version', async () => {
  const initial = await createDemoDelivery(seed), selected = buildIn(initial);
  const approved = reviewDemoBuild(initial, selected, true, 'Ready for release', 'Reviewer');
  assert.equal(selected.status, 'ready'); assert.equal(selected.revision, 1);
  assert.equal(buildIn(approved).status, 'approved'); assert.equal(buildIn(approved).revision, 2);
  assert.equal(buildIn(approved).reviewed_by, 'Reviewer');
  const sourceArtifacts = structuredClone(buildIn(approved).artifacts), sourceContent = structuredClone(buildIn(approved).content!);
  const selection = { ...buildIn(approved), artifacts: [], content: null };
  const published = await publishDemoBuild(approved, selection, '1.2.0', ' New map route ', 'Publisher');
  const manifest = published.releases[0];
  assert.equal(buildIn(approved).status, 'approved'); assert.equal(buildIn(published).status, 'published');
  assert.equal(buildIn(published).revision, 3); assert.equal(published.active.windows, 'windows:1.2.0');
  assert.equal(manifest.source_build_id, selected.id); assert.equal(manifest.source_commit, selected.commit);
  assert.equal(manifest.published_by, 'Publisher'); assert.equal(manifest.notes, 'New map route');
  assert.deepEqual(manifest.artifacts, sourceArtifacts); assert.deepEqual(buildIn(published).content, sourceContent);
  const sealed = await sealBundle({ ...sourceContent, bundle_version: '1.2.0' }, manifest.published_at), bytes = JSON.stringify(sealed);
  assert.equal(manifest.content.sha256, hash(bytes)); assert.equal(manifest.content.size_bytes, Buffer.byteLength(bytes));
  const { checksum, ...payload } = manifest;
  assert.equal(checksum, 'sha256:' + hash(canonicalJson(payload)));
  buildIn(approved).artifacts[0].sha256 = '0'.repeat(64);
  buildIn(published).artifacts[0].file = 'edited-after-publish.bundle';
  assert.deepEqual(manifest.artifacts, sourceArtifacts);
});

test('demo review requires a completed build, a current revision and rejection feedback', async () => {
  const initial = await createDemoDelivery(seed), selected = buildIn(initial);
  assert.throws(() => reviewDemoBuild(initial, { ...selected, revision: 0 }, true, '', 'Admin'), /changed/);
  assert.throws(() => reviewDemoBuild(initial, buildIn(initial, 'demo-local'), true, '', 'Admin'), /completed/);
  assert.throws(() => reviewDemoBuild(initial, selected, false, '  ', 'Admin'), /Feedback/);
  const returned = reviewDemoBuild(initial, selected, false, '  Check the model rig  ', 'Admin');
  assert.equal(buildIn(returned).status, 'rejected'); assert.equal(buildIn(returned).note, 'Check the model rig');
  await assert.rejects(publishDemoBuild(returned, buildIn(returned), '1.2.0', '', 'Admin'), /approved/);
});

test('approval and publication reject invalid completed build metadata and gameplay content', async () => {
  const changes: ((b: GameBuild) => void)[] = [
    b => { b.platform = null; },
    b => { b.min_client_version = null; },
    b => { b.commit = 'not-a-commit'; },
    b => { b.content = null; },
    b => { b.content!.weapons[0].damage = -1; },
    b => { b.artifacts = []; },
    b => { b.artifacts[0].kind = 'preview'; b.artifacts[1].kind = 'preview'; },
    b => { b.artifacts[0].sha256 = 'invalid'; },
    b => { b.artifacts[0].size_bytes = 0; },
    b => { b.artifacts[0].dependencies = ['missing.bundle']; },
    b => { b.artifacts[1].dependencies = ['maps.bundle']; },
  ];
  for (const change of changes) {
    const initial = await createDemoDelivery(seed), build = buildIn(initial); change(build);
    assert.throws(() => reviewDemoBuild(initial, build, true, '', 'Admin'), /metadata|validation|dependency/);
    build.status = 'approved';
    await assert.rejects(publishDemoBuild(initial, build, '1.2.0', '', 'Admin'), /metadata|validation|dependency/);
  }
});

test('publication rejects unapproved builds, stale revisions and duplicate platform versions', async () => {
  const initial = await createDemoDelivery(seed), selected = buildIn(initial);
  await assert.rejects(publishDemoBuild(initial, selected, '1.2.0', '', 'Admin'), /approved/);
  const approved = reviewDemoBuild(initial, selected, true, '', 'Admin'), build = buildIn(approved);
  await assert.rejects(publishDemoBuild(approved, selected, '1.2.0', '', 'Admin'), /changed/);
  await assert.rejects(publishDemoBuild(approved, build, 'latest', '', 'Admin'), /version/);
  await assert.rejects(publishDemoBuild(approved, build, '1.0.0', '', 'Admin'), /already exists/);
});

test('publication invalidates other pending and approved builds only for the changed platform', async () => {
  const initial = await createDemoDelivery(seed), selected = buildIn(initial, 'demo-approved');
  const otherPlatform = { ...structuredClone(buildIn(initial)), id: 'linux-ready', platform: 'linux' as const, baseline_commit: null };
  initial.builds.push(otherPlatform);
  const queuedApproved = { ...structuredClone(buildIn(initial)), id: 'windows-approved', status: 'approved' as const };
  initial.builds.push(queuedApproved);
  const published = await publishDemoBuild(initial, selected, '1.1.0', '', 'Admin');
  assert.equal(buildIn(published).stale, true); assert.equal(buildIn(published, queuedApproved.id).stale, true);
  assert.equal(buildIn(published, otherPlatform.id).stale, undefined); assert.equal(buildIn(published, selected.id).stale, false);
  assert.equal(buildIn(published, 'demo-local').status, 'awaiting_build');
  assert.throws(() => reviewDemoBuild(published, buildIn(published), true, '', 'Admin'), /baseline changed/);
  await assert.rejects(publishDemoBuild(published, buildIn(published, queuedApproved.id), '1.2.0', '', 'Admin'), /baseline changed/);
  const approvedLinux = reviewDemoBuild(published, buildIn(published, otherPlatform.id), true, '', 'Admin');
  const releasedLinux = await publishDemoBuild(approvedLinux, buildIn(approvedLinux, otherPlatform.id), '1.0.0', '', 'Admin');
  assert.equal(releasedLinux.active.windows, 'windows:1.1.0'); assert.equal(releasedLinux.active.linux, 'linux:1.0.0');
});

test('baseline checks do not depend on a cached stale flag', async () => {
  const initial = await createDemoDelivery(seed), build = buildIn(initial);
  build.baseline_commit = '9'.repeat(40); build.stale = false;
  assert.throws(() => reviewDemoBuild(initial, build, true, '', 'Admin'), /baseline changed/);
  build.status = 'approved';
  await assert.rejects(publishDemoBuild(initial, build, '1.2.0', '', 'Admin'), /baseline changed/);
});
