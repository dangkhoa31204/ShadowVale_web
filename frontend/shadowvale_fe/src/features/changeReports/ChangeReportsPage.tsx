import { useTranslation } from '../preferences/preferencesContext';
import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { useWorkspace } from '../content/workspaceContext';
import { validateBundle } from '../content/workspaceService';
import { BundleDetails } from '../content/BundleDetails';
import { collections, type Draft } from '../content/types';
import { gameDeliveryService } from '../gameDelivery/gameDeliveryService';
import type { GameBuild } from '../gameDelivery/types';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { EvidencePreview, ReportDetails } from './ReportDetails';
import { ReviewPackageButton } from './ReviewPackageButton';
import { evidenceService } from './evidenceService';
import { validateChangeReport } from './reportValidation';
import { newChangeReport, newReportChange, reportCategories, type ReportChange } from './types';
import './changeReports.css';
import { isDemoMode } from '../../config/environment';
import { localReports } from './localReports';
import { errorMessage } from '../../services/api/errors';
import { contentApi } from '../content/contentApi';

function ReportEditor({ draft, sources }: { draft: Draft; sources: GameBuild[] }) {
  const t = useTranslation();
  const { state, execute, busy } = useWorkspace(), toast = useToast();
  const [report, setReport] = useState(() => structuredClone(draft.changeReport || newChangeReport()));
  const [label, setLabel] = useState(draft.label), [dirty, setDirty] = useState(false), [uploading, setUploading] = useState('');
  const uploadingRef = useRef(false);
  const [showValidation, setShowValidation] = useState(false);
  const validationRef = useRef<HTMLDivElement>(null);
  const editable = !isDemoMode || draft.status === 'draft';
  const [hasSaved, setHasSaved] = useState(!!draft.changeReport);
  const blockers = useBlocker(({ currentLocation, nextLocation }) => (dirty || !!uploading) && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search);
  const errors = [...(!label.trim() ? ['Enter a version label.'] : []), ...validateChangeReport(report), ...(isDemoMode ? validateBundle(draft.bundle) : [])];
  useEffect(() => {
    if (showValidation) {
      validationRef.current?.focus({ preventScroll: true });
      validationRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [showValidation]);
  const baseline = state.releases.find(release => release.sourceDraftId === draft.parent_version_id);
  const sourceOptions = sources.filter(source => source.source === report.source.kind);
  const imageCount = report.changes.filter(change => change.image).length;
  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading]);
  function update(change: Partial<typeof report>) { setReport(previous => ({ ...previous, ...change })); setDirty(true); }
  function updateChange(id: string, change: Partial<ReportChange>) {
    setReport(previous => ({ ...previous, changes: previous.changes.map(entry => entry.id === id ? { ...entry, ...change } : entry) }));
    setDirty(true);
  }
  async function importImage(id: string, file: File) {
    if (uploadingRef.current) return;
    uploadingRef.current = true; setUploading(id);
    try { updateChange(id, { image: await evidenceService.upload(draft.id, file) }); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not import the image.'); }
    finally { uploadingRef.current = false; setUploading(''); }
  }
  async function save(submit = false) {
    if (busy || uploadingRef.current) return;
    if (!isDemoMode) { try { localReports.save(draft.id, report); setDirty(false); setHasSaved(true); toast.success('Report saved locally. It has not been sent to the server.'); } catch (e) { toast.error(errorMessage(e)); } return; }
    if (submit && errors.length) {
      setShowValidation(true);
      validationRef.current?.focus();
      return;
    }
    if (!label.trim()) return;
    try {
      let current = draft;
      if (dirty || !draft.changeReport) {
        const next = await execute({ type: 'saveDraft', id: draft.id, revision: draft.revision, title: label, label, bundle: draft.bundle, changeReport: report });
        current = next.drafts.find(entry => entry.id === draft.id)!;
      }
      if (submit) await execute({ type: 'submitDraft', id: current.id, revision: current.revision });
      setDirty(false);
    } catch { /* Workspace shows the error. */ }
  }

  return <>
    {blockers.state === 'blocked' && <div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-labelledby="report-unsaved"><h2 id="report-unsaved">{t("Leave unsaved report?")}</h2><p>{t("Save the report or discard your edits.")}</p><div><button className="sv-button" onClick={() => blockers.reset()}>{t("Keep editing")}</button><button className="sv-button sv-button-danger" onClick={() => blockers.proceed()}>{t("Discard & leave")}</button></div></section></div>}
    <section className="sv-panel sv-report-editor">
      <div className="sv-panel-heading"><div><h2>#{draft.version_no} · {draft.label}</h2><p>{t("Revision")} {draft.revision}{dirty ? t(" · Unsaved changes") : ''}</p></div><div className="sv-row-actions"><Status value={draft.status} />{editable && <><button className="sv-button" disabled={busy || !!uploading || (!dirty && !!draft.changeReport) || !label.trim()} onClick={() => void save()}>{t("Save report")}</button><button className="sv-button sv-button-primary" disabled={!isDemoMode || busy || !!uploading} title={!isDemoMode ? 'Backend report/evidence API unavailable. Submit content separately in Content authoring.' : undefined} aria-describedby={showValidation && errors.length ? 'report-submit-errors' : undefined} onClick={() => void save(true)}><Icon name="send" />{t("Send bundle for review")}</button></>}{isDemoMode && draft.status === 'rejected' && <button className="sv-button sv-button-primary" disabled={busy} onClick={() => void execute({ type: 'editRejectedDraft', id: draft.id, revision: draft.revision }).catch(() => {})}>{t("Resume draft")}</button>}</div></div>
      {!isDemoMode && <div className="sv-alert sv-report-note">{t("Local draft — chưa đồng bộ server. Save/export stores this report in your browser. Reports and images cannot be submitted through the current BE.")}<Link to={'/admin/content/' + draft.id}>{t("Submit content JSON separately")}</Link></div>}
      {editable && showValidation && errors.length > 0 && <div ref={validationRef} id="report-submit-errors" className="sv-alert sv-alert-error sv-report-note" role="alert" tabIndex={-1}><strong>{t("Complete this report before sending")}</strong><ul style={{ listStyle: 'disc', paddingLeft: 20, marginTop: 8 }}>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
      {draft.note && <div className="sv-alert sv-report-note"><strong>{t("Review note")}</strong><p>{draft.note}</p></div>}
      {!editable ? <>
        <div className="sv-alert sv-report-note">{draft.status === 'rejected' ? t("Resume the draft to update the report and evidence.") : t("This bundle is locked for review.")}</div>
        {draft.changeReport ? <ReportDetails report={draft.changeReport} contentVersionId={draft.id} /> : <Empty title={t("No change report attached")} />}
      </> : <fieldset className="sv-report-fields" disabled={busy}>
        <div className="sv-report-meta sv-form">
          <label>{t("Version label")}<input disabled={!isDemoMode} value={label} onChange={event => { setLabel(event.target.value); setDirty(true); }} placeholder={t("e.g. Rescue route & interface update")} /></label>
          <label className="sv-report-summary-input">{t("Report summary")}<textarea rows={2} value={report.summary} onChange={event => update({ summary: event.target.value })} placeholder={t("Describe the updates included in this bundle.")} /></label>
          <label>{t("Source")}<select value={report.source.kind} onChange={event => update({ source: { kind: event.target.value as 'git' | 'ci', branch: '', commit: '' } })}><option value="git">{t("Local Git")}</option><option value="ci">{t("Git / CI")}</option></select></label>
          <label>{t("Source commit")}<select value={report.source.build_id || ''} onChange={event => {
            const source = sources.find(source => source.id === event.target.value);
            update({ source: source ? { kind: source.source, branch: source.branch, commit: source.commit, build_id: source.id, build_title: source.title } : { kind: report.source.kind, branch: report.source.branch, commit: report.source.commit } });
          }}><option value="">{t("Enter reference manually")}</option>{sourceOptions.map(source => <option key={source.id} value={source.id}>{source.commit.slice(0, 8)} · {source.title}</option>)}</select></label>
          <label>{t("Branch")}<input value={report.source.branch} onChange={event => update({ source: { kind: report.source.kind, branch: event.target.value, commit: report.source.commit } })} placeholder={t("e.g. feature/rescue-route")} /></label>
          <label>{t("Commit")}<input className="sv-mono" value={report.source.commit} onChange={event => update({ source: { kind: report.source.kind, branch: report.source.branch, commit: event.target.value } })} placeholder={t("Git commit hash")} /></label>
        </div>
        <div className="sv-report-changes-heading"><div><h3>{t("Changes & evidence")}</h3><span>{report.changes.length} {t("changes ·")} {imageCount} {t("images")}</span></div><button className="sv-button sv-button-small" disabled={!!uploading || report.changes.length >= 12} onClick={() => update({ changes: [...report.changes, newReportChange()] })}><Icon name="add" />{t("Add change")}</button></div>
        <div className="sv-report-change-list">{report.changes.map((change, index) => <article className="sv-report-change-editor" key={change.id}>
          <div className="sv-report-change-header"><span>{t("Change")} {index + 1}</span><button className="sv-report-remove" aria-label={t("Remove change ") + (index + 1)} disabled={!!uploading} onClick={() => update({ changes: report.changes.filter(entry => entry.id !== change.id) })}><Icon name="close" /></button></div>
          <div className="sv-report-edit-grid"><div className="sv-form sv-report-change-fields">
            <div className="sv-report-title-row"><label>{t("Category")}<select value={change.category} onChange={event => updateChange(change.id, { category: event.target.value as ReportChange['category'] })}>{reportCategories.map(category => <option key={category.key} value={category.key}>{category.label}</option>)}</select></label><label>{t("Change title")}<input value={change.title} onChange={event => updateChange(change.id, { title: event.target.value })} placeholder={t("e.g. Update mission navigation")} /></label></div>
            <label>{t("Description")}<textarea value={change.description} rows={4} onChange={event => updateChange(change.id, { description: event.target.value })} placeholder={t("Explain the interface or logic change and what the player will experience.")} /></label>
            <label>{t("File / scene path")}<span className="sv-report-optional">{t("optional")}</span><input value={change.path} onChange={event => updateChange(change.id, { path: event.target.value })} placeholder={t("Assets/Scripts/Missions/RescueMission.cs")} /></label>
            <details className="sv-report-context"><summary>{t("Previous behavior & verification")}</summary><label>{t("Previous behavior")}<textarea rows={2} value={change.previous_behavior} onChange={event => updateChange(change.id, { previous_behavior: event.target.value })} /></label><label>{t("Verification")}<textarea rows={2} value={change.verification} onChange={event => updateChange(change.id, { verification: event.target.value })} placeholder={t("How did you check this change?")} /></label></details>
          </div><div className="sv-report-evidence">
            <span className="sv-report-image-label">{t("Evidence image")}<small>{t("optional")}</small></span>
            {change.image ? <EvidencePreview key={change.image.id} image={change.image} caption={change.image_caption || change.title || 'Change ' + (index + 1)} /> : <div className="sv-evidence-placeholder"><Icon name="add_photo_alternate" /><strong>{t("Add a screenshot")}</strong><span>{t("Show the interface, mission route or logic result.")}</span></div>}
            <div className="sv-report-image-actions"><label className={'sv-button sv-button-small sv-image-import ' + (uploading ? 'is-disabled' : '')}><Icon name="upload" />{uploading === change.id ? t("Importing…") : change.image ? t("Replace image") : t("Import image")}<input type="file" accept="image/png,image/jpeg,image/webp" aria-label={t("Evidence image for change ") + (index + 1)} disabled={!!uploading} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importImage(change.id, file); }} /></label>{change.image && <button className="sv-button sv-button-small" disabled={!!uploading} onClick={() => updateChange(change.id, { image: null, image_caption: '' })}>{t("Remove image")}</button>}</div>
            <small>{t("PNG, JPG, WebP · up to 2 MB")}</small>
            {change.image && <label className="sv-form sv-report-caption">{t("Image caption")}<input value={change.image_caption} onChange={event => updateChange(change.id, { image_caption: event.target.value })} placeholder={t("What should the reviewer notice?")} /></label>}
          </div></div>
        </article>)}{!report.changes.length && <Empty title={t("Add your first change")} description={t("Attach an image and describe the update.")} />}</div>
      </fieldset>}
      <div className="sv-report-bundle-summary"><Icon name="inventory_2" /><div><h3>{t("Content bundle #")} {draft.version_no}</h3><p>{t("Report, evidence images and saved gameplay content.")}</p><span>{collections.reduce((total, collection) => total + draft.bundle[collection.key].length, 0)} {t("content records ·")} {report.changes.length} {t("reported changes ·")} {imageCount} {t("images")}</span></div><div className="sv-row-actions">{editable && <Link className="sv-button sv-button-small" to={'/admin/content/' + draft.id}>{t("Edit stats")}</Link>}{(draft.changeReport || hasSaved) && <ReviewPackageButton content={draft.bundle} report={report} revision={draft.revision} disabled={dirty || !!uploading} />}</div></div>
      <details className="sv-report-content-preview"><summary>{t("View included content")}</summary><BundleDetails key={draft.id} before={baseline?.bundle} after={draft.bundle} /></details>
      {editable && !showValidation && errors.length > 0 && <details className="sv-report-checklist"><summary>{errors.length} {t("things to complete before sending")}</summary><ul>{errors.slice(0, 12).map((error, index) => <li key={index}>{error}</li>)}</ul></details>}
    </section>
  </>;
}

export function ChangeReportsPage() {
  const t = useTranslation();
  const { state, execute, busy } = useWorkspace(), { user } = useAuth();
  const { draftId } = useParams(), navigate = useNavigate();
  const [sources, setSources] = useState<GameBuild[]>([]), [sourceError, setSourceError] = useState('');
  const [creating, setCreating] = useState(false), [label, setLabel] = useState('');
  const drafts = state.drafts.filter(draft => draft.authorId === user?.id);
  const selected = draftId ? drafts.find(draft => draft.id === draftId) : drafts.find(draft => draft.status === 'draft') || drafts[0];
  useEffect(() => {
    if (!isDemoMode) return;
    let active = true;
    gameDeliveryService.load().then(delivery => { if (active) setSources(delivery.builds); }).catch(() => { if (active) setSourceError('Source commits unavailable. You can enter the branch and commit manually.'); });
    return () => { active = false; };
  }, []);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    try {
      const next = await execute({ type: 'createDraft', title: label, label });
      setCreating(false); setLabel(''); navigate('/admin/change-reports/' + next.drafts[0].id);
    } catch { /* Workspace reports errors. */ }
  }
  return <div className="sv-page"><PageHeading title={t("Change reports")} description={t("Images and descriptions of your Git updates.")} action={<button className="sv-button sv-button-primary" onClick={() => setCreating(!creating)}><Icon name="add" />{t("New report bundle")}</button>} />
    {sourceError && <div className="sv-alert" role="status">{sourceError}</div>}
    {creating && <form className="sv-inline-form sv-panel sv-form" onSubmit={create}><label>{t("Version label")}<input required autoFocus value={label} onChange={event => setLabel(event.target.value)} placeholder={t("e.g. Rescue route & interface update")} /></label><button className="sv-button sv-button-primary" disabled={busy || !label.trim()}>{t("Create bundle")}</button><button className="sv-button" type="button" onClick={() => setCreating(false)}>{t("Cancel")}</button></form>}
    <div className="sv-draft-picker">{drafts.map(draft => <Link key={draft.id} to={'/admin/change-reports/' + draft.id} className={draft.id === selected?.id ? 'is-active' : ''}><span>#{draft.version_no} · {draft.label}</span><Status value={draft.status} /></Link>)}</div>
    {selected ? isDemoMode ? <ReportEditor key={selected.id + ':' + selected.revision} draft={selected} sources={sources} /> : <LocalReportEditor key={selected.id + ':' + selected.revision} id={selected.id} /> : <Empty title={draftId ? t("Content version not found") : t("Create your first report bundle")} />}
  </div>;
}
function LocalReportEditor({ id }: { id: string }) {
  const t = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null), [error, setError] = useState(''), [retry,setRetry] = useState(0);
  useEffect(() => { let active = true; contentApi.editor(id).then(d => { if (active) { setDraft({ ...d, changeReport: localReports.load(id) }); setError(''); } }).catch(e => { if(active) setError(errorMessage(e)); }); return () => { active = false; }; }, [id,retry]);
  return error ? <div className="sv-alert sv-alert-error">{error}<button className="sv-button" onClick={()=>setRetry(retry+1)}>{t("Retry")}</button></div> : draft ? <ReportEditor draft={draft} sources={[]} /> : <div className="sv-empty" role="status">{t("Loading local report…")}</div>;
}
