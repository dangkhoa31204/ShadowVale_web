import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { can } from '../auth/access';
import { useWorkspace } from '../content/workspaceContext';
import { BundleDetails } from '../content/BundleDetails';
import { GamePublishPanel } from '../gameDelivery/GamePublishPanel';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { dateLabel, downloadJson } from '../shared/format';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../template/tailadmin/Table';
import { ReportDetails } from '../changeReports/ReportDetails';
import { ReviewPackageButton } from '../changeReports/ReviewPackageButton';

type Confirmation = { type: 'publish'; id: string; revision: number } | { type: 'rollback'; id: string };

export function ReleasesPage() {
  const { state, execute, busy } = useWorkspace(), { user } = useAuth();
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  const [beforeId, setBeforeId] = useState(state.releases[1]?.id || state.releases[0]?.id || '');
  const [afterId, setAfterId] = useState(state.releases[0]?.id || '');
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [reason, setReason] = useState('');
  const [detailId, setDetailId] = useState('');
  const detailRef = useRef<HTMLElement>(null);
  const [params, setParams] = useSearchParams();
  const view = params.get('source') === 'game' ? 'game' : 'content';
  const before = state.releases.find(r => r.id === beforeId), after = state.releases.find(r => r.id === afterId);
  const approved = state.drafts.filter(d => d.status === 'approved');
  const canPublish = !!user && can(user.role, 'publish');
  const canCompare = user?.role !== 'admin';
  const target = confirm?.type === 'publish' ? state.drafts.find(d => d.id === confirm.id) : state.releases.find(r => r.id === confirm?.id);

  useEffect(() => {
    if (detailId) detailRef.current?.scrollIntoView({ block: 'nearest' });
  }, [detailId]);

  function setView(next: string) {
    const query = new URLSearchParams(params);
    query.set('source', next); query.delete('build');
    setParams(query, { replace: true });
  }
  function closeDetails() {
    document.getElementById('release-toggle-' + detailId)?.focus();
    setDetailId('');
  }
  function requestAction(next: Confirmation) { setReason(''); setConfirm(next); }
  async function confirmAction() {
    if (!confirm || !reason.trim()) return;
    try {
      if (confirm.type === 'rollback') await execute({ type: 'restoreRelease', id: confirm.id, reason });
      else await execute({ type: 'publishDraft', id: confirm.id, revision: confirm.revision, reason });
      setConfirm(null); setReason('');
    } catch { /* Provider displays the error. */ }
  }
  function versionName(id: string | null) {
    if (!id) return '—';
    const version = state.drafts.find(d => d.id === id) || state.releases.find(r => r.sourceDraftId === id);
    return version ? '#' + version.version_no : id;
  }

  return <div className="sv-page">
    <PageHeading title={canPublish ? 'Publish versions' : 'Versions'} />
    {canPublish && <div className="sv-detail-tabs sv-review-source-tabs" role="group" aria-label="Release source">
      <button aria-pressed={view === 'content'} className={view === 'content' ? 'is-active' : ''} onClick={() => setView('content')}>Content versions</button>
      <button aria-pressed={view === 'game'} className={view === 'game' ? 'is-active' : ''} onClick={() => setView('game')}>Game bundle</button>
    </div>}
    {canPublish && view === 'game' ? <GamePublishPanel /> : <>
      {active && <section className="sv-active-release sv-panel">
        <div className="sv-release-symbol"><Icon name="deployed_code" /></div>
        <div><span className="sv-eyebrow">Published content</span><h2>#{active.version_no} · {active.label}</h2><p>{dateLabel(active.publishedAt)} · {active.publishedBy}</p></div>
        <button className="sv-button" onClick={() => downloadJson(active.bundle, 'shadowvale-content-' + active.version_no + '.json')}><Icon name="download" />JSON</button>
      </section>}

      {canPublish && <section className="sv-panel">
        <div className="sv-panel-heading"><h2>Approved content</h2><span className="sv-count">{approved.length}</span></div>
        {approved.length ? approved.map(d => <div className="sv-publish-row" key={d.id}>
          <div><strong>{d.label}</strong><small>#{d.version_no} · Reviewed by {d.reviewedBy || '—'}</small></div>
          <div className="sv-row-actions"><Link className="sv-button" to={'/admin/reviews?draft=' + encodeURIComponent(d.id)}>View changes</Link><button className="sv-button sv-button-primary" disabled={busy} onClick={() => requestAction({ type: 'publish', id: d.id, revision: d.revision })}>Publish version</button></div>
        </div>) : <Empty title="No approved content" />}
      </section>}

      <section className="sv-panel">
        <div className="sv-panel-heading"><h2>Content versions</h2></div>
        <div className="sv-table-wrap sv-release-table-wrap"><Table className="sv-table sv-release-table">
          <thead><tr><th>Version</th><th>Label</th><th>Published</th><th>Published by</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{state.releases.map(r => {
            const parentId = state.drafts.find(d => d.id === r.sourceDraftId)?.parent_version_id;
            const baseline = state.releases.find(entry => entry.sourceDraftId === parentId);
            return <Fragment key={r.id}>
              <tr className={detailId === r.id ? 'sv-release-selected' : undefined}>
                <td data-label="Version" className="sv-mono"><strong>#{r.version_no}</strong></td><td data-label="Label">{r.label}</td>
                <td data-label="Published">{dateLabel(r.publishedAt)}</td><td data-label="Published by">{r.publishedBy}</td><td data-label="Status"><Status value={r.status} /></td>
                <td data-label="Actions"><div className="sv-row-actions">
                  {canPublish && <button id={'release-toggle-' + r.id} className="sv-button sv-button-small" aria-expanded={detailId === r.id} aria-controls={'release-detail-' + r.id} onClick={() => setDetailId(detailId === r.id ? '' : r.id)}>{detailId === r.id ? 'Hide changes' : 'View changes'}</button>}
                  <button className="sv-button sv-button-small" onClick={() => downloadJson(r.bundle, 'shadowvale-content-' + r.version_no + '.json')}>JSON</button>
                  {r.changeReport && <ReviewPackageButton content={r.bundle} report={r.changeReport} revision={r.revision || 0} />}
                  {canPublish && r.status === 'archived' && <button className="sv-button sv-button-small" disabled={busy} onClick={() => requestAction({ type: 'rollback', id: r.id })}>Rollback</button>}
                </div></td>
              </tr>
              {detailId === r.id && <tr className="sv-release-detail-row"><td colSpan={6}>
                <section ref={detailRef} id={'release-detail-' + r.id} aria-label={'Changes for version ' + r.version_no}>
                  <div className="sv-panel-heading"><div><h2>#{r.version_no} · {r.label}</h2>{r.changelog && <p>{r.changelog}</p>}</div><button className="sv-button sv-button-small" onClick={closeDetails}>Close</button></div>
                  {r.changeReport && <ReportDetails report={r.changeReport} contentVersionId={r.sourceDraftId} />}
                  <BundleDetails before={baseline?.bundle} after={r.bundle} />
                </section>
              </td></tr>}
            </Fragment>;
          })}</tbody>
        </Table></div>
      </section>

      {canPublish && <section className="sv-panel sv-publication-history">
        <div className="sv-panel-heading"><h2>Publication history</h2></div>
        {state.publications.length ? <div className="sv-table-wrap"><Table className="sv-table">
          <TableHeader><TableRow>{['Action', 'Version', 'Previous version', 'Reason', 'Actor', 'Occurred'].map(label => <TableCell key={label} isHeader>{label}</TableCell>)}</TableRow></TableHeader>
          <TableBody>{state.publications.map(entry => <TableRow key={entry.id}>
            <TableCell>{entry.action === 'publish' ? 'Publish' : 'Rollback'}</TableCell><TableCell>{versionName(entry.content_version_id)}</TableCell><TableCell>{versionName(entry.previous_version_id)}</TableCell>
            <TableCell>{entry.reason}</TableCell><TableCell>{state.users.find(u => u.id === entry.actor_id)?.callsign || entry.actor_id || '—'}</TableCell><TableCell>{dateLabel(entry.occurred_at)}</TableCell>
          </TableRow>)}</TableBody>
        </Table></div> : <Empty title="No publication history" />}
      </section>}

      {canCompare && <section className="sv-panel">
        <div className="sv-panel-heading"><h2>Compare versions</h2><div className="sv-compare-controls sv-form">
          <label>From<select value={beforeId} onChange={e => setBeforeId(e.target.value)}>{state.releases.map(r => <option key={r.id} value={r.id}>#{r.version_no} · {r.label}</option>)}</select></label><Icon name="arrow_forward" />
          <label>To<select value={afterId} onChange={e => setAfterId(e.target.value)}>{state.releases.map(r => <option key={r.id} value={r.id}>#{r.version_no} · {r.label}</option>)}</select></label>
        </div></div>
        {after ? <BundleDetails key={beforeId + afterId} before={before?.bundle} after={after.bundle} /> : <Empty title="No versions" />}
      </section>}

      {confirm && <div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-labelledby="release-confirm" onKeyDown={e => { if (e.key === 'Escape' && !busy) setConfirm(null); }}>
        <h2 id="release-confirm">{confirm.type === 'publish' ? 'Publish' : 'Rollback to'} version #{target?.version_no}?</h2>
        <p>{target?.label}</p>
        <div className="sv-form sv-release-reason"><label>Reason<textarea autoFocus required value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder={confirm.type === 'publish' ? 'Describe this publication' : 'Why roll back to this version?'} /></label></div>
        <div><button className="sv-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button className="sv-button sv-button-primary" disabled={busy || !reason.trim() || !target} onClick={confirmAction}>{busy ? 'Saving…' : confirm.type === 'publish' ? 'Publish version' : 'Rollback version'}</button></div>
      </section></div>}
    </>}
  </div>;
}
