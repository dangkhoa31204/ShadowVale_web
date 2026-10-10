import type { User } from '../../types/user';
import type { Command, ContentBundle, Draft, Workspace } from './types';
import { can } from '../auth/access.ts';
import { sealBundle } from './validation.ts';
import { validateChangeReport } from '../changeReports/reportValidation.ts';

/** Local demo workflow. API mode sends commands to the backend instead. */
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
  const authorOnly = (draft: Draft) => {
    requirePermission('author');
    if (draft.authorId !== actor.id) throw new Error('Only the author can edit this content version.');
  };
  const assertReportValid = (draft: Draft) => {
    const errors = validateChangeReport(draft.changeReport);
    if (errors.length) throw new Error('Change report: ' + errors.slice(0, 3).join('; '));
  };
  const archiveActive = () => {
    const active = next.releases.find(release => release.id === next.activeReleaseId);
    if (active) {
      active.status = 'archived';
      const content = next.drafts.find(draft => draft.id === active.sourceDraftId);
      if (content) { content.status = 'archived'; content.archived_at = at; }
    }
    return active?.sourceDraftId || null;
  };
  const publication = (contentVersionId: string, previousVersionId: string | null, action: 'publish' | 'rollback', reason: string) => {
    next.publications.unshift({ id: Math.max(0, ...next.publications.map(entry => entry.id)) + 1, content_version_id: contentVersionId, previous_version_id: previousVersionId, action, actor_id: actor.id, reason: reason.trim(), occurred_at: at });
  };
  let target: string;
  if ('revision' in command) {
    const draft = next.drafts.find(entry => entry.id === command.id);
    if (!draft) throw new Error('Content version not found.');
    if (draft.revision !== command.revision) throw new Error('This content version has changed. Reload it before saving.');
    target = draft.label;
    if (command.type === 'editRejectedDraft') {
      authorOnly(draft);
      if (draft.status !== 'rejected') throw new Error('Only rejected content can return to draft.');
      draft.status = 'draft';
    } else if (command.type === 'saveDraft' || command.type === 'submitDraft') {
      authorOnly(draft);
      if (draft.status !== 'draft') throw new Error('Only draft content is editable. Return rejected content to draft first.');
      if (command.type === 'saveDraft') {
        const label = (command.label ?? command.title).trim();
        if (!label) throw new Error('A content version label is required.');
        if (command.bundle.version_no !== draft.version_no) throw new Error('Version number is managed by the backend.');
        draft.label = label; draft.title = label; draft.changelog = command.changelog ?? draft.changelog;
        draft.bundle = structuredClone(command.bundle);
        draft.bundle.label = label; draft.bundle.changelog = draft.changelog;
        delete draft.bundle.checksum; delete draft.bundle.published_at;
        if (command.changeReport !== undefined) draft.changeReport = structuredClone(command.changeReport);
        draft.note = ''; delete draft.reviewedBy; delete draft.reviewedAt;
        draft.validation_errors = validate(draft.bundle); delete draft.validated_at; delete draft.bundle_checksum;
        draft.revision++;
      } else {
        assertValid(draft.bundle); assertReportValid(draft); draft.status = 'in_review'; draft.note = ''; draft.submitted_at = at;
        draft.validation_errors = []; draft.validated_at = at;
      }
    } else if (command.type === 'reviewDraft') {
      requirePermission('review');
      if (draft.status !== 'in_review') throw new Error('This content version is not awaiting review.');
      if (command.approve) { assertValid(draft.bundle); assertReportValid(draft); }
      else if (!command.note.trim()) throw new Error('Explain the changes required before rejecting the content.');
      draft.status = command.approve ? 'approved' : 'rejected';
      draft.note = command.note.trim(); draft.reviewedBy = actor.callsign; draft.reviewedAt = at;
    } else {
      requirePermission('publish');
      if (draft.status !== 'approved') throw new Error('Only approved content can be published.');
      if (!command.reason.trim()) throw new Error('A publication reason is required.');
      assertValid(draft.bundle);
      assertReportValid(draft);
      if (next.releases.some(release => release.version_no === draft.version_no)) throw new Error('This content version is already published.');
      const bundle = await sealBundle(draft.bundle, at);
      const previous = archiveActive();
      const release = { id: draft.id, version_no: draft.version_no, label: draft.label, changelog: draft.changelog, status: 'published' as const, version: String(draft.version_no), publishedAt: at, publishedBy: actor.callsign, bundle, sourceDraftId: draft.id, revision: draft.revision, ...(draft.changeReport ? { changeReport: structuredClone(draft.changeReport) } : {}) };
      next.releases.unshift(release); next.activeReleaseId = release.id;
      draft.status = 'published'; draft.bundle = bundle; draft.bundle_checksum = bundle.checksum;
      draft.published_by = actor.id; draft.published_at = at;
      publication(draft.id, previous, 'publish', command.reason);
    }
    draft.updatedAt = at;
  } else if (command.type === 'createDraft') {
    requirePermission('author');
    const label = (command.label ?? command.title).trim();
    if (!label) throw new Error('A content version label is required.');
    const source = next.releases.find(release => release.id === (command.sourceReleaseId || next.activeReleaseId));
    if (!source) throw new Error('Source content version not found.');
    const bundle = structuredClone(source.bundle), contentId = id();
    delete bundle.published_at; delete bundle.checksum;
    bundle.version_no = Math.max(0, ...next.releases.map(release => release.version_no), ...next.drafts.map(draft => draft.version_no)) + 1;
    bundle.label = label; bundle.changelog = command.changelog || ''; bundle.content_version_id = contentId;
    for (const value of Object.values(bundle)) if (Array.isArray(value)) for (const row of value) {
      if (row && typeof row === 'object' && 'content_version_id' in row) row.content_version_id = contentId;
    }
    const draft: Draft = { id: contentId, version_no: bundle.version_no, label, changelog: bundle.changelog, parent_version_id: source.sourceDraftId, title: label, authorId: actor.id, authorName: actor.callsign, status: 'draft', revision: 0, created_at: at, updatedAt: at, bundle, note: '' };
    next.drafts.unshift(draft); target = label;
  } else if (command.type === 'restoreRelease') {
    requirePermission('publish');
    if (!command.reason.trim()) throw new Error('A rollback reason is required.');
    const release = next.releases.find(entry => entry.id === command.id);
    if (!release) throw new Error('Content version not found.');
    if (release.status !== 'archived' || release.id === next.activeReleaseId) throw new Error('Only archived content can be rolled back.');
    assertValid(release.bundle);
    const previous = archiveActive(); release.status = 'published';
    next.activeReleaseId = release.id;
    const content = next.drafts.find(draft => draft.id === release.sourceDraftId);
    if (content) { content.status = 'published'; delete content.archived_at; }
    publication(release.sourceDraftId, previous, 'rollback', command.reason); target = release.label;
  } else if (command.type === 'saveConfig') {
    requirePermission('settings'); next.config = { reviewRequired: true, telemetryEnabled: command.telemetryEnabled }; target = 'Portal configuration';
  } else {
    requirePermission('users');
    if (command.type === 'createUser') {
      if (!command.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(command.email)) throw new Error('A name and valid email are required.');
      if (next.users.some(user => user.email.toLowerCase() === command.email.toLowerCase())) throw new Error('An account with this email already exists.');
      next.users.push({ id: id(), callsign: command.name.trim(), email: command.email.toLowerCase(), role: command.role, active: true, tier: 'Internal team', clearanceLevel: command.role, createdAt: at }); target = command.email;
    } else {
      const user = next.users.find(entry => entry.id === command.id);
      if (!user) throw new Error('User not found.');
      if (user.id === actor.id) throw new Error('You cannot remove or change your own access.');
      if (user.role === 'admin' && user.active && next.users.filter(entry => entry.role === 'admin' && entry.active).length <= 1 && (command.type === 'deleteUser' || command.role !== 'admin' || !command.active)) throw new Error('At least one active admin must remain.');
      target = user.email;
      if (command.type === 'deleteUser') next.users = next.users.filter(entry => entry.id !== user.id);
      else { user.role = command.role; user.active = command.active; }
    }
  }
  next.audit.unshift({ id: id(), at, actor: actor.callsign, action: command.type, target });
  return next;
}
