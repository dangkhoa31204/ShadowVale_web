import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useWorkspace } from '../content/workspaceContext';
import { BundleDetails } from '../content/BundleDetails';
import { validateBundle } from '../content/workspaceService';
import { Empty, Icon, PageHeading, Panel, Status } from '../shared/ui';
import { dateLabel } from '../shared/format';
import { isDemoMode } from '../../config/environment';
import { ApiReviewsPage } from './ApiVersions';
export function ReviewsPage() { return isDemoMode ? <DemoReviewsPage /> : <ApiReviewsPage />; }
function DemoReviewsPage() {
  const { state, execute, busy, reload } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('draft') || '';
  function setSelectedId(id: string) { const query = new URLSearchParams(params); if (id) query.set('draft', id); else query.delete('draft'); setParams(query, { replace: true }); }
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('all');

  const submissions = state.drafts.filter(d => d.status !== 'draft' && d.status !== 'archived');
  const visible = submissions.filter(d => status === 'all' || d.status === status);
  const draft = visible.find(d => d.id === selectedId) || visible.find(d => d.status === 'in_review') || visible[0];
  const baseline = state.releases.find(r => r.sourceDraftId === draft?.parent_version_id);
  const errors = draft ? validateBundle(draft.bundle) : [];
  async function review(approve: boolean) {
    if (!draft) return;
    try { await execute({ type: 'reviewDraft', id: draft.id, revision: draft.revision, approve, note }); setSelectedId(draft.id); setNote(''); }
    catch { /* Provider displays the error. */ }
  }
  return <div className="sv-page"><PageHeading title="Review content" action={<Button variant="outline" disabled={busy} onClick={() => void reload()}><Icon name="sync" />Refresh submissions</Button>} />
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
      <Panel title="Submissions">
        <Field className="border-b p-5"><FieldLabel htmlFor="review-status">Status</FieldLabel><NativeSelect id="review-status" className="w-full" value={status} onChange={e => { setStatus(e.target.value); setSelectedId(''); setNote(''); }}>{[['all', 'All submissions'], ['in_review', 'In review'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['published', 'Published']].map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</NativeSelect></Field>
        {visible.map(d => <button key={d.id} aria-current={draft?.id === d.id || undefined} className={cn('grid w-full gap-1 border-b border-l-2 border-l-transparent px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/50', draft?.id === d.id && 'border-l-primary bg-primary/5')} onClick={() => { setSelectedId(d.id); setNote(''); }}><strong className="text-sm font-medium">{d.label}</strong><small className="text-xs text-muted-foreground">#{d.version_no} · {d.authorName}</small><Status value={d.status} /></button>)}
        {!visible.length && <Empty title="No submissions" />}
      </Panel>
      {draft && <Panel title={draft.label} description={<>Version #{draft.version_no} · Revision {draft.revision} · {draft.authorName}<br />Submitted {dateLabel(draft.submitted_at || draft.updatedAt)}</>} action={<Status value={draft.status} />}>
        <div className="grid gap-3 border-b p-6">
          {draft.changelog && <p className="text-sm">{draft.changelog}</p>}
          {errors.length ? <Alert variant="destructive"><AlertDescription>{errors.join('; ')}</AlertDescription></Alert> : <Alert><AlertDescription className="text-success">Validation passed</AlertDescription></Alert>}
        </div>
        <BundleDetails key={draft.id} before={baseline?.bundle} after={draft.bundle} />
        {draft.status === 'in_review' ? <div className="grid gap-4 border-t p-6"><Field><FieldLabel htmlFor="review-note">Review note</FieldLabel><Textarea id="review-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Required when rejecting content" rows={3} /></Field><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy || !note.trim()} onClick={() => review(false)}>Reject content</Button><Button disabled={busy || errors.length > 0} onClick={() => review(true)}>Approve content</Button></div></div>
          : draft.note && <p className="border-t p-6 text-sm text-muted-foreground">{draft.note}</p>}
      </Panel>}
    </div>
  </div>;
}
