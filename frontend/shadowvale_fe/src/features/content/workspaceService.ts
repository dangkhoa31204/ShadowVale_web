import schema from './contracts/content.schema.json';
import seed from './contracts/demo-bundle.json';
import { isDemoMode } from '../../config/environment';
import { axiosClient } from '../../services/api/axiosClient';
import { demoAccounts, demoUser } from '../../services/auth/authService';
import type { Command, ContentBundle, Workspace } from './types';
import type { User } from '../../types/user';
import { createBundleValidator, sealBundle } from './validation';
import { applyCommand } from './workflow';
import { DEMO_WORKSPACE_KEY } from '../../config/demo';

export const validateBundle = createBundleValidator(schema);
async function initialWorkspace(): Promise<Workspace> {
  const bundle = await sealBundle(seed as ContentBundle, '2026-09-18T00:00:00Z');
  const draftBundle = structuredClone(seed) as ContentBundle;
  draftBundle.bundle_version = '1.1.0'; draftBundle.weapons[0].damage = 26;
  return {
    storageVersion: 1, activeReleaseId: 'release-1',
    releases: [{ id: 'release-1', version: '1.0.0', publishedAt: bundle.published_at!, publishedBy: 'Jordan Admin', bundle, sourceDraftId: 'initial' }],
    drafts: [
      { id: 'draft-balance', title: 'Map 01 · combat balance pass', authorId: 'designer', authorName: 'Alex Designer', status: 'in_review', revision: 1, updatedAt: '2026-10-08T07:30:00Z', bundle: draftBundle, note: '' },
      { id: 'draft-stealth', title: 'Stealth & weapon tuning', authorId: 'designer', authorName: 'Alex Designer', status: 'draft', revision: 1, updatedAt: '2026-10-08T06:00:00Z', bundle: { ...structuredClone(seed) as ContentBundle, bundle_version: '1.0.1' }, note: '' },
    ],
    users: demoAccounts.map(a => ({ ...demoUser(a), active: true })),
    audit: [{ id: 'audit-1', at: '2026-10-08T07:30:00Z', actor: 'Alex Designer', action: 'submitDraft', target: 'Map 01 · combat balance pass' }],
    config: { reviewRequired: true, telemetryEnabled: true },
  };
}
export const workspaceService = {
  load: async (): Promise<Workspace> => {
    if (!isDemoMode) return (await axiosClient.get<Workspace>('/internal/workspace')).data;
    const saved = localStorage.getItem(DEMO_WORKSPACE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as Workspace;
      if (state.storageVersion !== 1 || !Array.isArray(state.drafts) || !Array.isArray(state.releases)) throw new Error('Demo workspace is invalid. Clear its storage key to reset it.');
      return state;
    }
    const state = await initialWorkspace();
    localStorage.setItem(DEMO_WORKSPACE_KEY, JSON.stringify(state)); return state;
  },
  execute: async (command: Command, actor: User): Promise<Workspace> => {
    if (!isDemoMode) return (await axiosClient.post<Workspace>('/internal/commands', command)).data;
    const state = await workspaceService.load();
    const currentActor = state.users.find(u => u.id === actor.id && u.active);
    if (!currentActor) throw new Error('Your account no longer has access to this workspace.');
    const next = await applyCommand(state, command, currentActor, validateBundle);
    localStorage.setItem(DEMO_WORKSPACE_KEY, JSON.stringify(next)); return next;
  },
};
