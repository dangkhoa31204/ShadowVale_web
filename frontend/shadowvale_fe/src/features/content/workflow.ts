import type { User } from '../../types/user';
import type { Command, ContentBundle, Workspace } from './types';
import { can } from '../auth/access.ts';
import { sealBundle } from './validation.ts';

export async function applyCommand(state: Workspace, command: Command, actor: User, validate: (bundle: unknown) => string[]): Promise<Workspace> {
  const next = structuredClone(state);
  const at = new Date().toISOString(), id = () => crypto.randomUUID();
  const requirePermission = (permission: Parameters<typeof can>[1]) => {
    if (!can(actor.role, permission)) throw new Error('Your role cannot perform this action.');
  };
  const assertValid = (bundle: ContentBundle) => {
    const errors = validate(bundle);
    if (errors.length) throw new Error('Validation failed: ' + errors.slice(0, 3).join('; '));
  };
  let target: string;
  if ('revision' in command) {
    const draft = next.drafts.find(d => d.id === command.id);
    if (!draft) throw new Error('Draft not found.');
    if (draft.revision !== command.revision) throw new Error('This draft has changed. Reload it before saving.');
    target = draft.title;
    if (command.type === 'saveDraft' || command.type === 'submitDraft') {
      requirePermission('author');
      if (draft.authorId !== actor.id) throw new Error('Only the author can edit this draft.');
      if (!['draft', 'changes_requested'].includes(draft.status)) throw new Error('Only editable drafts can be saved or submitted.');
      if (command.type === 'saveDraft') {
        if (!command.title.trim()) throw new Error('A draft title is required.');
        draft.title = command.title.trim(); draft.bundle = structuredClone(command.bundle);
        delete draft.bundle.checksum; delete draft.bundle.published_at;
        draft.status = 'draft'; draft.note = ''; delete draft.reviewedBy; delete draft.reviewedAt;
      } else {
        assertValid(draft.bundle); draft.status = 'in_review'; draft.note = '';
      }
    } else if (command.type === 'reviewDraft') {
      requirePermission('review');
      if (draft.status !== 'in_review') throw new Error('This draft is not awaiting review.');
      if (command.approve) assertValid(draft.bundle);
      else if (!command.note.trim()) throw new Error('Explain the changes required before returning the draft.');
      draft.status = command.approve ? 'approved' : 'changes_requested';
      draft.note = command.note.trim(); draft.reviewedBy = actor.callsign; draft.reviewedAt = at;
    } else {
      requirePermission('publish');
      if (draft.status !== 'approved') throw new Error('Only an approved draft can be published.');
      assertValid(draft.bundle);
      if (next.releases.some(r => r.version === draft.bundle.bundle_version)) throw new Error('This version is already published. Use a new version.');
      const bundle = await sealBundle(draft.bundle, at);
      const release = { id: id(), version: bundle.bundle_version, publishedAt: at, publishedBy: actor.callsign, bundle, sourceDraftId: draft.id };
      next.releases.unshift(release); next.activeReleaseId = release.id; draft.status = 'published';
    }
    draft.revision++; draft.updatedAt = at;
  } else if (command.type === 'createDraft') {
    requirePermission('author');
    if (!command.title.trim()) throw new Error('A draft title is required.');
    const release = next.releases.find(r => r.id === (command.sourceReleaseId || next.activeReleaseId));
    if (!release) throw new Error('Source release not found.');
    const bundle = structuredClone(release.bundle);
    delete bundle.published_at; delete bundle.checksum;
    const [major, minor, patch] = bundle.bundle_version.split('.').map(Number);
    let nextPatch = patch + 1;
    while ([...next.releases.map(r => r.version), ...next.drafts.map(d => d.bundle.bundle_version)].includes(`${major}.${minor}.${nextPatch}`)) nextPatch++;
    bundle.bundle_version = `${major}.${minor}.${nextPatch}`;
    const draft = { id: id(), title: command.title.trim(), authorId: actor.id, authorName: actor.callsign, status: 'draft' as const, revision: 1, updatedAt: at, bundle, note: '' };
    next.drafts.unshift(draft); target = draft.title;
  } else if (command.type === 'restoreRelease') {
    requirePermission('publish');
    const release = next.releases.find(r => r.id === command.id);
    if (!release) throw new Error('Release not found.');
    assertValid(release.bundle); next.activeReleaseId = release.id; target = release.version;
  } else if (command.type === 'saveConfig') {
    requirePermission('settings');
    next.config = { reviewRequired: true, telemetryEnabled: command.telemetryEnabled }; target = 'Portal configuration';
  } else {
    requirePermission('users');
    if (command.type === 'createUser') {
      if (!command.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(command.email)) throw new Error('A name and valid email are required.');
      if (next.users.some(u => u.email.toLowerCase() === command.email.toLowerCase())) throw new Error('An account with this email already exists.');
      next.users.push({ id: id(), callsign: command.name.trim(), email: command.email.toLowerCase(), role: command.role, active: true, tier: 'Internal team', clearanceLevel: command.role, createdAt: at });
      target = command.email;
    } else {
      const user = next.users.find(u => u.id === command.id);
      if (!user) throw new Error('User not found.');
      if (user.id === actor.id) throw new Error('You cannot remove or change your own access.');
      if (user.role === 'admin' && user.active && next.users.filter(u => u.role === 'admin' && u.active).length <= 1 && (command.type === 'deleteUser' || command.role !== 'admin' || !command.active)) throw new Error('At least one active admin must remain.');
      target = user.email;
      if (command.type === 'deleteUser') next.users = next.users.filter(u => u.id !== user.id);
      else { user.role = command.role; user.active = command.active; }
    }
  }
  next.audit.unshift({ id: id(), at, actor: actor.callsign, action: command.type, target });
  return next;
}
