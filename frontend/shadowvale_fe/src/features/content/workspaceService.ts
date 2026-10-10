import schema from './contracts/content.schema.json';
import seed from './contracts/demo-bundle.json';
import { isDemoMode } from '../../config/environment';
import { contentApi } from './contentApi';
import { demoAccounts, demoUser } from '../../services/auth/authService';
import type { Command, ContentBundle, Draft, DraftStatus, Workspace } from './types';
import type { User } from '../../types/user';
import { createBundleValidator, sealBundle } from './validation';
import { applyCommand } from './workflow';
import { DEMO_WORKSPACE_KEY } from '../../config/demo';

export const validateBundle = createBundleValidator(schema);
async function initialWorkspace(): Promise<Workspace> {
  const bundle = await sealBundle(seed as ContentBundle, '2026-09-18T00:00:00Z');
  const make = (id: string, version_no: number, label: string, status: DraftStatus, damage: number): Draft => {
    const content = structuredClone(seed) as ContentBundle;
    content.version_no = version_no; content.label = label; content.changelog = 'Adjust weapon damage and enemy perception.';
    content.weapons[0].damage = damage;
    return { id, version_no, label, changelog: content.changelog, parent_version_id: 'content-1', title: label, authorId: 'designer', authorName: 'Alex Designer', status, revision: 1, created_at: '2026-10-08T06:00:00Z', updatedAt: '2026-10-08T07:30:00Z', bundle: content, note: '' };
  };
  const pending = make('draft-balance', 2, 'Map 01 · combat balance pass', 'in_review', 26);
  pending.submitted_at = '2026-10-08T07:30:00Z';
  const approved = make('draft-approved', 4, 'Rifle handling update', 'approved', 25);
  approved.reviewedBy = 'Jordan Admin'; approved.reviewedAt = '2026-10-08T07:00:00Z';
  const rejected = make('draft-returned', 5, 'Enemy perception tuning', 'rejected', 24);
  rejected.note = 'Reduce scout vision range before resubmitting.'; rejected.reviewedBy = 'Jordan Admin'; rejected.reviewedAt = '2026-10-08T07:15:00Z';
  return {
    storageVersion: 2, activeReleaseId: 'content-1',
    releases: [{ id: 'content-1', version_no: 1, label: bundle.label, changelog: bundle.changelog || '', status: 'published', version: '1', publishedAt: bundle.published_at!, publishedBy: 'Jordan Admin', bundle, sourceDraftId: 'content-1' }],
    drafts: [pending, make('draft-stealth', 3, 'Stealth & weapon tuning', 'draft', 24), approved, rejected,
      { id: 'content-1', version_no: 1, label: bundle.label, changelog: bundle.changelog || '', title: bundle.label, authorId: 'designer', authorName: 'Alex Designer', status: 'published', revision: 1, updatedAt: bundle.published_at!, bundle, bundle_checksum: bundle.checksum, note: '', published_by: 'admin', published_at: bundle.published_at }],
    publications: [{ id: 1, content_version_id: 'content-1', previous_version_id: null, action: 'publish', actor_id: 'admin', reason: 'Initial release for playtesting.', occurred_at: bundle.published_at! }],
    users: demoAccounts.map(account => ({ ...demoUser(account), active: true })),
    audit: [{ id: 'audit-1', at: '2026-10-08T07:30:00Z', actor: 'Alex Designer', action: 'submitDraft', target: pending.label }],
    config: { reviewRequired: true, telemetryEnabled: true },
  };
}
export const workspaceService = {
  load: async (): Promise<Workspace> => {
    if (!isDemoMode) return contentApi.workspace();
    const saved = localStorage.getItem(DEMO_WORKSPACE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as Workspace;
      if (state.storageVersion !== 2 || !Array.isArray(state.drafts) || !Array.isArray(state.releases) || !Array.isArray(state.publications)) throw new Error('Demo workspace is invalid. Clear its storage key to reset it.');
      return state;
    }
    const state = await initialWorkspace();
    localStorage.setItem(DEMO_WORKSPACE_KEY, JSON.stringify(state)); return state;
  },
  execute: async (command: Command, actor: User): Promise<Workspace> => {
    if (!isDemoMode) return contentApi.execute(command);
    const state = await workspaceService.load();
    const currentActor = state.users.find(user => user.id === actor.id && user.active);
    if (!currentActor) throw new Error('Your account no longer has access to this workspace.');
    const next = await applyCommand(state, command, currentActor, validateBundle);
    localStorage.setItem(DEMO_WORKSPACE_KEY, JSON.stringify(next)); return next;
  },
};
