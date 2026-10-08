import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { can } from '../auth/access';
import { useWorkspace } from '../content/workspaceContext';
import { compareBundles } from '../content/validation';
import { BundleDetails } from '../content/BundleDetails';
import { GamePublishPanel } from '../gameDelivery/GamePublishPanel';
import { Empty, Icon, PageHeading } from '../shared/ui';
import { dateLabel, downloadJson } from '../shared/format';
export function ReleasesPage() {
  const { state, execute, busy } = useWorkspace(), { user } = useAuth();
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  const [beforeId, setBeforeId] = useState(state.releases[0]?.id || '');
  const [afterId, setAfterId] = useState(state.releases[1]?.id || state.releases[0]?.id || '');
  const [confirm, setConfirm] = useState<{ type: 'publish'; id: string } | { type: 'restore'; id: string } | null>(null);
  const [detailId, setDetailId] = useState('');
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (detailId) detailRef.current?.scrollIntoView({ block: 'nearest' });
  }, [detailId]);
  const before = state.releases.find(r => r.id === beforeId), after = state.releases.find(r => r.id === afterId);
  const changes = before && after ? compareBundles(before.bundle, after.bundle) : [];
  const approved = state.drafts.filter(d => d.status === 'approved');
  const canPublish = user && can(user.role, 'publish');
  const [params, setParams] = useSearchParams();
  const view = params.get('source') === 'game' ? 'game' : 'content';
  function setView(next: string) { const query = new URLSearchParams(params); query.set('source', next); query.delete('build'); setParams(query, { replace: true }); }
  const canCompare = user?.role !== 'admin';
  function closeDetails() {
    document.getElementById('release-toggle-' + detailId)?.focus();
    setDetailId('');
  }
  async function confirmAction() {
    if (!confirm) return;
    try {
      if (confirm.type === 'restore') await execute({ type: 'restoreRelease', id: confirm.id });
      else {
        const draft = state.drafts.find(d => d.id === confirm.id)!;
        await execute({ type: 'publishDraft', id: draft.id, revision: draft.revision });
      }
      setConfirm(null);
    } catch { /* Provider displays the error. */ }
  }
  return <div className="sv-page"><PageHeading title={canPublish ? 'Publish versions' : 'Versions'} />
    {canPublish && <div className="sv-detail-tabs sv-review-source-tabs" role="group" aria-label="Release source"><button aria-pressed={view === 'content'} className={view === 'content' ? 'is-active' : ''} onClick={() => setView('content')}>Gameplay content</button><button aria-pressed={view === 'game'} className={view === 'game' ? 'is-active' : ''} onClick={() => setView('game')}>Game bundle</button></div>}
    {canPublish && view === 'game' ? <GamePublishPanel /> : <>
    {active && <section className="sv-active-release sv-panel"><div className="sv-release-symbol"><Icon name="deployed_code" /></div><div><span className="sv-eyebrow">ACTIVE VERSION</span><h2 className="sv-mono">v{active.version}</h2><p>{dateLabel(active.publishedAt)} · {active.publishedBy}</p></div><button className="sv-button" onClick={() => downloadJson(active.bundle, 'shadowvale-v' + active.version + '.json')}><Icon name="download" />JSON</button></section>}
    {canPublish && <section className="sv-panel"><div className="sv-panel-heading"><h2>Approved content</h2><span className="sv-count">{approved.length}</span></div>{approved.length ? approved.map(d => <div className="sv-publish-row" key={d.id}><div><strong>{d.title}</strong><small>v{d.bundle.bundle_version} · {d.reviewedBy}</small></div><div className="sv-row-actions"><Link className="sv-button" to={'/admin/reviews?draft=' + encodeURIComponent(d.id)}>View changes</Link><button className="sv-button sv-button-primary" disabled={busy} onClick={() => setConfirm({ type: 'publish', id: d.id })}>Publish</button></div></div>) : <Empty title="No approved content" />}</section>}
    <section className="sv-panel"><div className="sv-panel-heading"><h2>Versions</h2></div><div className="sv-table-wrap sv-release-table-wrap"><table className="sv-table sv-release-table"><thead><tr><th>Version</th><th>Published</th><th>Published by</th><th>Status</th><th>Actions</th></tr></thead><tbody>{state.releases.map((r, index) => <Fragment key={r.id}>
      <tr className={detailId === r.id ? 'sv-release-selected' : undefined}><td data-label="Version" className="sv-mono"><strong>v{r.version}</strong></td><td data-label="Published">{dateLabel(r.publishedAt)}</td><td data-label="Published by">{r.publishedBy}</td><td data-label="Status"><span className={'sv-version-tag ' + (r.id === state.activeReleaseId ? 'is-active' : '')}>{r.id === state.activeReleaseId ? 'Active' : 'Archived'}</span></td><td data-label="Actions"><div className="sv-row-actions">{canPublish && <button id={'release-toggle-' + r.id} className="sv-button sv-button-small" aria-expanded={detailId === r.id} aria-controls={'release-detail-' + r.id} onClick={() => setDetailId(detailId === r.id ? '' : r.id)}>{detailId === r.id ? 'Hide changes' : 'View changes'}</button>}<button className="sv-button sv-button-small" onClick={() => downloadJson(r.bundle, 'shadowvale-v' + r.version + '.json')}>JSON</button>{canPublish && r.id !== state.activeReleaseId && <button className="sv-button sv-button-small" onClick={() => setConfirm({ type: 'restore', id: r.id })}>Restore</button>}</div></td></tr>
      {detailId === r.id && <tr className="sv-release-detail-row"><td colSpan={5}><section ref={detailRef} id={'release-detail-' + r.id} aria-label={'Changes for v' + r.version}><div className="sv-panel-heading"><h2>v{r.version} · Changes</h2><button className="sv-button sv-button-small" onClick={closeDetails}>Close</button></div><BundleDetails before={state.releases[index + 1]?.bundle} after={r.bundle} /></section></td></tr>}
    </Fragment>)}</tbody></table></div></section>
    {canCompare && <section className="sv-panel"><div className="sv-panel-heading"><h2>Compare versions</h2><div className="sv-compare-controls sv-form"><label>From<select value={beforeId} onChange={e => setBeforeId(e.target.value)}>{state.releases.map(r => <option key={r.id} value={r.id}>v{r.version}</option>)}</select></label><Icon name="arrow_forward" /><label>To<select value={afterId} onChange={e => setAfterId(e.target.value)}>{state.releases.map(r => <option key={r.id} value={r.id}>v{r.version}</option>)}</select></label></div></div>
      {changes.length ? <div className="sv-diff-list">{changes.map((d, i) => <div className="sv-diff" key={i}><strong className="sv-mono">{d.path}</strong><div><pre className="sv-diff-before">{JSON.stringify(d.before, null, 2) ?? '(absent)'}</pre><pre className="sv-diff-after">{JSON.stringify(d.after, null, 2) ?? '(removed)'}</pre></div></div>)}</div> : <Empty title="No differences" />}
    </section>}
    {confirm && <div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-labelledby="release-confirm"><h2 id="release-confirm">{confirm.type === 'publish' ? 'Publish' : 'Restore'} v{confirm.type === 'publish' ? state.drafts.find(d => d.id === confirm.id)?.bundle.bundle_version : state.releases.find(r => r.id === confirm.id)?.version}?</h2><p>This version becomes active.</p><div><button className="sv-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button className="sv-button sv-button-primary" disabled={busy} onClick={confirmAction}>{busy ? 'Saving…' : 'Confirm'}</button></div></section></div>}
    </>}
  </div>;
}
