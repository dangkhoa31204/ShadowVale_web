import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../content/workspaceContext';
import { BundleDetails } from '../content/BundleDetails';
import { validateBundle } from '../content/workspaceService';
import { Empty, PageHeading, Status } from '../shared/ui';
import { dateLabel } from '../shared/format';
import { GameChangesPanel } from '../gameDelivery/GameChangesPanel';
export function ReviewsPage() {
  const { state, execute, busy } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const view = params.get('source') === 'game' ? 'game' : 'content';
  function setView(next: string) { const query = new URLSearchParams(params); query.set('source', next); setParams(query); }
  const [selectedId, setSelectedId] = useState(params.get('draft') || ''), [note, setNote] = useState('');
  const [status, setStatus] = useState('all');
  const pending = state.drafts.filter(d => d.status === 'in_review');
  const submissions = state.drafts.filter(d => d.status !== 'draft');
  const visible = submissions.filter(d => status === 'all' || d.status === status);
  const draft = submissions.find(d => d.id === selectedId) || visible.find(d => d.status === 'in_review') || visible[0];
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  const publishedIndex = draft ? state.releases.findIndex(r => r.sourceDraftId === draft.id) : -1;
  const baseline = publishedIndex >= 0 ? state.releases[publishedIndex + 1] : active;
  const errors = draft ? validateBundle(draft.bundle) : [];
  async function review(approve: boolean) {
    if (!draft) return;
    try { await execute({ type: 'reviewDraft', id: draft.id, revision: draft.revision, approve, note }); setSelectedId(draft.id); setNote(''); }
    catch { /* Provider displays the error. */ }
  }
  return <div className="sv-page"><PageHeading title="Review content" />
    <div className="sv-detail-tabs sv-review-source-tabs" role="group" aria-label="Review source"><button className={view === 'content' ? 'is-active' : ''} aria-pressed={view === 'content'} onClick={() => setView('content')}>Gameplay content</button><button className={view === 'game' ? 'is-active' : ''} aria-pressed={view === 'game'} onClick={() => setView('game')}>Game changes</button></div>
    {view === 'game' ? <GameChangesPanel /> : <div className="sv-review-layout"><aside className="sv-panel"><div className="sv-panel-heading"><h2>Submissions</h2><span className="sv-count">{pending.length} pending</span></div><label className="sv-review-filter">Status<select value={status} onChange={e => { setStatus(e.target.value); setSelectedId(''); setNote(''); }}><option value="all">All submissions</option><option value="in_review">Pending</option><option value="approved">Approved</option><option value="changes_requested">Returned</option><option value="published">Published</option></select></label>{visible.map(d => <button key={d.id} className={'sv-review-item ' + (draft?.id === d.id ? 'is-active' : '')} onClick={() => { setSelectedId(d.id); setNote(''); }}><strong>{d.title}</strong><small>{d.authorName} · v{d.bundle.bundle_version}</small><Status value={d.status} /></button>)}{!visible.length && <Empty title="No submissions" />}</aside>
      {draft && <section className="sv-panel sv-review-detail"><div className="sv-panel-heading"><div><h2>{draft.title}</h2><p>v{draft.bundle.bundle_version} · {draft.authorName} · {dateLabel(draft.updatedAt)}</p></div><Status value={draft.status} /></div>
        <div className={'sv-alert ' + (errors.length ? 'sv-alert-error' : 'sv-alert-success')}>{errors.length ? errors.join('; ') : 'Validation passed'}</div>
        <BundleDetails key={draft.id} before={baseline?.bundle} after={draft.bundle} />
        {draft.status === 'in_review' ? <div className="sv-form sv-review-actions"><label>Feedback<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Required when requesting changes" rows={3} /></label><div><button className="sv-button" disabled={busy || !note.trim()} onClick={() => review(false)}>Request changes</button><button className="sv-button sv-button-primary" disabled={busy || errors.length > 0} onClick={() => review(true)}>Approve</button></div></div> : draft.note && <p className="sv-review-note">{draft.note}</p>}
      </section>}
    </div>}</div>;
}
