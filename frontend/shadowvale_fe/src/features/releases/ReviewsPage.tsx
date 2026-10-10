import { useTranslation } from '../preferences/preferencesContext';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../content/workspaceContext';
import { BundleDetails } from '../content/BundleDetails';
import { validateBundle } from '../content/workspaceService';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { dateLabel } from '../shared/format';
import { GameChangesPanel } from '../gameDelivery/GameChangesPanel';
import { ReportDetails } from '../changeReports/ReportDetails';
import { ReviewPackageButton } from '../changeReports/ReviewPackageButton';
import { validateChangeReport } from '../changeReports/reportValidation';
import { isDemoMode } from '../../config/environment';
import { ApiReviewsPage } from './ApiVersions';
export function ReviewsPage() { return isDemoMode ? <DemoReviewsPage /> : <ApiReviewsPage />; }
function DemoReviewsPage() {
  const t = useTranslation();
  const { state, execute, busy, reload } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const view = params.get('source') === 'game' ? 'game' : 'content';
  function setView(next: string) { const query = new URLSearchParams(params); query.set('source', next); query.delete('build'); setParams(query); setNote(''); setDetailView('report'); setStatus('all'); }
  const selectedId = params.get('draft') || '';
  function setSelectedId(id: string) { const query = new URLSearchParams(params); if (id) query.set('draft', id); else query.delete('draft'); setParams(query, { replace: true }); }
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('all');
  const [detailView, setDetailView] = useState<'report' | 'content'>('report');

  const submissions = state.drafts.filter(d => d.status !== 'draft' && (view !== 'game' || !!d.changeReport));
  const pending = submissions.filter(d => d.status === 'in_review');
  const visible = submissions.filter(d => status === 'all' || d.status === status);
  const draft = visible.find(d => d.id === selectedId) || visible.find(d => d.status === 'in_review') || visible[0];
  const baseline = state.releases.find(r => r.sourceDraftId === draft?.parent_version_id);
  const errors = draft ? [...validateBundle(draft.bundle), ...validateChangeReport(draft.changeReport)] : [];
  async function review(approve: boolean) {
    if (!draft) return;
    try { await execute({ type: 'reviewDraft', id: draft.id, revision: draft.revision, approve, note }); setSelectedId(draft.id); setNote(''); }
    catch { /* Provider displays the error. */ }
  }
  return <div className="sv-page"><PageHeading title={t("Review content")} action={<button className="sv-button" disabled={busy} onClick={() => void reload()}><Icon name="sync" />{t("Refresh submissions")}</button>} />
    <div className="sv-detail-tabs sv-review-source-tabs" role="group" aria-label={t("Review source")}><button className={view === 'content' ? 'is-active' : ''} aria-pressed={view === 'content'} onClick={() => setView('content')}>{t("Content versions")}</button><button className={view === 'game' ? 'is-active' : ''} aria-pressed={view === 'game'} onClick={() => setView('game')}>{t("Game changes")}</button></div>
    <div className="sv-review-layout"><aside className="sv-panel"><div className="sv-panel-heading"><h2>{view === 'game' ? t("Designer change reports") : t("Submissions")}</h2><span className="sv-count">{pending.length} {t("in review")}</span></div><label className="sv-review-filter">{t("Status")}<select value={status} onChange={e => { setStatus(e.target.value); setSelectedId(''); setNote(''); }}><option value="all">{t("All submissions")}</option><option value="in_review">{t("In review")}</option><option value="approved">{t("Approved")}</option><option value="rejected">{t("Rejected")}</option><option value="published">{t("Published")}</option><option value="archived">{t("Archived")}</option></select></label>{visible.map(d => <button key={d.id} className={'sv-review-item ' + (draft?.id === d.id ? 'is-active' : '')} onClick={() => { setSelectedId(d.id); setNote(''); setDetailView('report'); }}><strong>{d.label}</strong><small>#{d.version_no} · {d.authorName}</small><Status value={d.status} /></button>)}{!visible.length && <Empty title={view === 'game' ? t("No designer change reports submitted") : t("No submissions")} />}</aside>
      {draft && <section className="sv-panel sv-review-detail"><div className="sv-panel-heading"><div><h2>{draft.label}</h2><p>{t("Version #")} {draft.version_no} {t("· Revision")} {draft.revision} · {draft.authorName}</p><small className="sv-reviewed-by">{t("Submitted")} {dateLabel(draft.submitted_at || draft.updatedAt)}</small></div><div className="sv-row-actions"><Status value={draft.status} />{draft.changeReport && <ReviewPackageButton key={draft.id + ':' + draft.revision} content={draft.bundle} report={draft.changeReport} revision={draft.revision} />}</div></div>
        {draft.changelog && <p className="sv-review-note">{draft.changelog}</p>}
        <div className={'sv-alert ' + (errors.length ? 'sv-alert-error' : 'sv-alert-success')}>{errors.length ? errors.join('; ') : t("Validation passed")}</div>
        {draft.changeReport && <div className="sv-detail-toolbar"><div className="sv-detail-tabs" role="group" aria-label={t("Review bundle view")}><button aria-pressed={detailView === 'report'} className={detailView === 'report' ? 'is-active' : ''} onClick={() => setDetailView('report')}>{t("Change report (")} {draft.changeReport.changes.length})</button><button aria-pressed={detailView === 'content'} className={detailView === 'content' ? 'is-active' : ''} onClick={() => setDetailView('content')}>{t("Gameplay content")}</button></div></div>}
        {draft.changeReport && detailView === 'report' ? <ReportDetails report={draft.changeReport} contentVersionId={draft.id} /> : <BundleDetails key={draft.id} before={baseline?.bundle} after={draft.bundle} />}
        {draft.status === 'in_review' ? <div className="sv-form sv-review-actions"><label>{t("Review note")}<textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t("Required when rejecting content")} rows={3} /></label><div><button className="sv-button" disabled={busy || !note.trim()} onClick={() => review(false)}>{t("Reject content")}</button><button className="sv-button sv-button-primary" disabled={busy || errors.length > 0} onClick={() => review(true)}>{t("Approve content")}</button></div></div> : draft.note && <p className="sv-review-note">{draft.note}</p>}
      </section>}
    </div>
    {view === 'game' && <details className="sv-panel" open={!!params.get('build')}><summary style={{ padding: 20, cursor: 'pointer' }}>{t("Git / CI source builds")}</summary><GameChangesPanel /></details>}
  </div>;
}
