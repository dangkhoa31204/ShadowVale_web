import { canonicalJson, createBundleValidator, sealBundle } from '../content/validation.ts';
import schema from '../content/contracts/content.schema.json' with { type: 'json' };
import type { ContentBundle } from '../content/types';
import type { DeliveryState, GameBuild, GameManifest } from './types';
async function hash(text: string) { const bytes = new TextEncoder().encode(text); return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join(''); }
const copy = <T,>(value: T): T => structuredClone(value);
const validateContent = createBundleValidator(schema);
const versionPattern = /^\d+\.\d+\.\d+$/;
function validateCompletedBuild(build: GameBuild) {
  if (!['windows', 'linux', 'macos', 'android'].includes(build.platform || '') || !versionPattern.test(build.min_client_version || '') || !/^[a-f0-9]{40}$/.test(build.commit))
    throw new Error('Completed build metadata requires a platform, source commit and minimum client version.');
  const errors = validateContent(build.content);
  if (errors.length) throw new Error('Gameplay content validation failed: ' + errors.slice(0, 3).join('; '));
  if (!Array.isArray(build.artifacts) || !build.artifacts.some(a => a.kind === 'assetbundle')) throw new Error('A completed build requires AssetBundle metadata.');
  const files = new Set<string>();
  for (const a of build.artifacts) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,140}$/.test(a.file) || a.file.includes('..') || !['assetbundle', 'preview'].includes(a.kind) || !/^[a-f0-9]{64}$/.test(a.sha256) || !Number.isSafeInteger(a.size_bytes) || a.size_bytes <= 0 || !a.url?.trim() || !Array.isArray(a.dependencies) || files.has(a.file))
      throw new Error('Invalid completed build artifact metadata.');
    files.add(a.file);
  }
  const visited = new Set<string>(), visiting = new Set<string>();
  function visit(file: string) {
    if (visited.has(file)) return;
    if (visiting.has(file)) throw new Error('Circular AssetBundle dependency.');
    const a = build.artifacts.find(item => item.file === file && item.kind === 'assetbundle');
    if (!a) throw new Error('Unknown AssetBundle dependency.');
    visiting.add(file); a.dependencies.forEach(visit); visiting.delete(file); visited.add(file);
  }
  for (const a of build.artifacts) {
    if (a.kind === 'assetbundle') visit(a.file);
    else a.dependencies.forEach(visit);
  }
}
function assertCurrentBaseline(state: DeliveryState, build: GameBuild) {
  const active = state.releases.find(r => r.platform === build.platform && state.active[r.platform] === r.platform + ':' + r.release_version);
  if (build.stale || (build.baseline_commit || null) !== (active?.source_commit || null)) throw new Error('Published baseline changed. Refresh this build before review or publication.');
}
export async function createDemoDelivery(seed: ContentBundle): Promise<DeliveryState> {
  const baseline = await sealBundle(seed, '2026-10-08T02:00:00Z');
  const content = copy(baseline); content.bundle_version = '1.1.0'; content.weapons[0].damage = 26;
  content.quests.push({ ...copy(content.quests[0]), id: 'quest_rescue_route', title: 'Rescue route' });
  const make = (id: string, title: string, status: GameBuild['status'], commit: string, source: GameBuild['source']): GameBuild => ({
    id, title, status, commit, parent_commit: '1'.repeat(40), branch: 'dev', author: 'Game developer', committed_at: '2026-10-08T12:00:00Z', source,
    revision: 1, platform: source === 'ci' ? 'windows' : null, min_client_version: source === 'ci' ? '1.0.0' : null, requires_client_update: false,
    baseline_commit: '1'.repeat(40), baseline_content: copy(baseline), content: source === 'ci' ? copy(content) : null,
    change_count: 4, changes: [
      { path: 'Assets/Scenes/Map 1.unity', category: 'maps', action: 'modified', summary: 'Added a rescue route through the forest shelter.', details: [{ label: 'Mission routes', before: '2', after: '3' }, { label: 'Checkpoints', before: '5', after: '8' }] },
      { path: 'Assets/Characters/Nam.fbx', category: 'models', action: 'modified', import_settings: true, summary: 'Updated the character mesh and material assignments.', details: [{ label: 'Triangles', before: '12,480', after: '14,620' }, { label: 'Materials', before: '2', after: '3' }] },
      { path: 'Assets/Materials/Forest.mat', category: 'graphics', action: 'modified', summary: 'Updated forest textures and lighting parameters.', details: [{ label: 'Texture resolution', before: '1024 × 1024', after: '2048 × 2048' }, { label: 'Surface', before: 'Standard', after: 'URP Lit' }] },
      { path: 'Content/quests/rescue_route.json', category: 'missions', action: 'added', summary: 'New rescue mission with a shelter checkpoint and extraction objective.', details: [{ label: 'Mission', before: null, after: 'Rescue route' }, { label: 'Route', before: null, after: 'Forest → Shelter → Extraction' }] },
    ],
    artifacts: source === 'ci' ? [{ file: 'maps.bundle', kind: 'assetbundle', url: '/demo/maps.bundle', size_bytes: 12582912, sha256: 'a'.repeat(64), dependencies: ['assets.bundle'] }, { file: 'assets.bundle', kind: 'assetbundle', url: '/demo/assets.bundle', size_bytes: 25165824, sha256: 'b'.repeat(64), dependencies: [] }] : [],
    previews: source === 'ci' ? [{ path: 'Assets/Scenes/Map 1.unity', file: 'map-review.jpg', url: '/game-previews/map-review.jpg' }] : [],
  });
  const ready = make('demo-ready', 'Map 01 · rescue route & visual update', 'ready', '3'.repeat(40), 'ci');
  const approved = make('demo-approved', 'Forest · model & texture update', 'approved', '2'.repeat(40), 'ci');
  approved.reviewed_by = 'Jordan Admin'; approved.reviewed_at = '2026-10-08T10:00:00Z';
  const local = make('demo-local', 'Map 02 · new mission path', 'awaiting_build', '4'.repeat(40), 'git');
  const published = make('demo-published', 'Initial game content', 'published', '1'.repeat(40), 'ci'); published.content = copy(baseline); published.baseline_content = null;
  const release = await manifestFor(published, '1.0.0', '', 'Jordan Admin', '2026-10-08T02:00:00Z');
  return { builds: [ready, local, approved, published], releases: [release], active: { windows: 'windows:1.0.0' }, source_error: null };
}
export function reviewDemoBuild(state: DeliveryState, selected: GameBuild, approve: boolean, note: string, actor: string): DeliveryState {
  const next = copy(state), build = next.builds.find(b => b.id === selected.id);
  if (!build || build.revision !== selected.revision) throw new Error('Build changed. Refresh before reviewing.');
  if (build.status !== 'ready') throw new Error('Only a completed build can be reviewed.');
  validateCompletedBuild(build); assertCurrentBaseline(next, build);
  if (!approve && !note.trim()) throw new Error('Feedback is required.');
  build.status = approve ? 'approved' : 'rejected'; build.note = note.trim(); build.reviewed_by = actor; build.reviewed_at = new Date().toISOString(); build.revision++;
  return next;
}
async function manifestFor(build: GameBuild, version: string, notes: string, actor: string, date: string): Promise<GameManifest> {
  const content = await sealBundle({ ...build.content!, bundle_version: version }, date), text = JSON.stringify(content);
  const manifest: GameManifest = { manifest_version: 1, release_version: version, platform: build.platform!, published_at: date, published_by: actor, source_commit: build.commit, source_build_id: build.id, min_client_version: build.min_client_version!, requires_client_update: build.requires_client_update, delivery: 'assetbundles', notes, content: { url: '/demo/content/' + version, sha256: await hash(text), size_bytes: new TextEncoder().encode(text).length }, artifacts: copy(build.artifacts), checksum: '' };
  const payload = Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== 'checksum'));
  manifest.checksum = 'sha256:' + await hash(canonicalJson(payload)); return manifest;
}
export async function publishDemoBuild(state: DeliveryState, selected: GameBuild, version: string, notes: string, actor: string): Promise<DeliveryState> {
  const next = copy(state), build = next.builds.find(b => b.id === selected.id);
  if (!build || build.status !== 'approved') throw new Error('Select an approved game build.');
  if (build.revision !== selected.revision) throw new Error('Build changed. Refresh before publishing.');
  validateCompletedBuild(build); assertCurrentBaseline(next, build);
  if (!versionPattern.test(version)) throw new Error('Use a version such as 1.2.0.');
  if (next.releases.some(r => r.platform === build.platform && r.release_version === version)) throw new Error('This game version already exists.');
  const manifest = await manifestFor(build, version, notes.trim(), actor, new Date().toISOString());
  build.status = 'published'; build.revision++; next.releases.unshift(manifest); next.active[manifest.platform] = manifest.platform + ':' + version;
  build.stale = false;
  for (const pending of next.builds)
    if (pending.platform === manifest.platform && ['ready', 'approved'].includes(pending.status)) pending.stale = (pending.baseline_commit || null) !== manifest.source_commit;
  return next;
}
