import { useTranslation } from '../preferences/preferencesContext';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { useToast } from '../../components/ui/Toast';
import { collections, type Draft } from '../content/types';
import { gameDeliveryService } from '../gameDelivery/gameDeliveryService';
import type { GameBuild } from '../gameDelivery/types';
import { Empty, Icon } from '../shared/ui';
import { EvidencePreview, ReportDetails } from './ReportDetails';
import { ReviewPackageButton } from './ReviewPackageButton';
import { evidenceService } from './evidenceService';
import { newReportChange, reportCategories, type ChangeReport, type ReportChange } from './types';
import { isDemoMode } from '../../config/environment';
import './changeReports.css';

/** Part of the version editor. Its parent owns changes and the single navigation guard. */
export function ContentChangeReport({ draft, report, pending, reportDirty, hasSaved, editable, busy, onChange, onUploading, onSave }: {
  draft: Draft; report: ChangeReport; pending: boolean; reportDirty: boolean; hasSaved: boolean; editable: boolean; busy: boolean;
  onChange: (report: SetStateAction<ChangeReport>) => void; onUploading: (uploading: boolean) => void; onSave: () => void;
}) {
  const t = useTranslation(), toast = useToast();
  const [sources, setSources] = useState<GameBuild[]>([]), [sourceError, setSourceError] = useState('');
  const [uploading, setUploading] = useState('');
  const uploadingRef = useRef(false);
  useEffect(() => {
    if (!isDemoMode) return;
    let active = true;
    gameDeliveryService.load().then(delivery => { if (active) setSources(delivery.builds); })
      .catch(() => { if (active) setSourceError('Source commits unavailable. You can enter the branch and commit manually.'); });
    return () => { active = false; };
  }, []);
  const sourceOptions = sources.filter(source => source.source === report.source.kind);
  const imageCount = report.changes.filter(change => change.image).length;
  function update(change: Partial<ChangeReport>) { onChange(previous => ({ ...previous, ...change })); }
  function updateChange(id: string, change: Partial<ReportChange>) {
    onChange(previous => ({ ...previous, changes: previous.changes.map(entry => entry.id === id ? { ...entry, ...change } : entry) }));
  }
  async function importImage(id: string, file: File) {
    if (uploadingRef.current) return;
    uploadingRef.current = true; setUploading(id); onUploading(true);
    try { updateChange(id, { image: await evidenceService.upload(draft.id, file) }); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not import the image.'); }
    finally { uploadingRef.current = false; setUploading(''); onUploading(false); }
  }
  return <section className="sv-authoring-report">
    <div className="sv-panel-heading"><div><h2>{t("Change report")} <small>{t("optional")}</small></h2><p>{t("Images and descriptions of your Git updates.")}</p></div>
      {editable && <button className="sv-button" disabled={busy || !!uploading || !reportDirty} onClick={onSave}><Icon name="save" />{t("Save report")}</button>}
    </div>
    {!isDemoMode && <div className="sv-alert sv-report-note">{t("Local draft — not synced to the server. Save/export stores this report in your browser. Reports and images cannot be submitted through the current BE.")}</div>}
    {sourceError && <div className="sv-alert sv-report-note" role="status">{t(sourceError)}</div>}
      {!editable ? <>
        <div className="sv-alert sv-report-note">{draft.status === 'rejected' ? t("Resume the draft to update the report and evidence.") : t("This bundle is locked for review.")}</div>
        {hasSaved ? <ReportDetails report={report} contentVersionId={draft.id} /> : <Empty title={t("No change report attached")} />}
      </> : <fieldset className="sv-report-fields" disabled={busy || !editable}>
        <div className="sv-report-meta sv-form">
          <label className="sv-report-summary-input">{t("Report summary")}<textarea data-testid="report-summary" rows={2} value={report.summary} onChange={event => update({ summary: event.target.value })} placeholder={t("Describe the updates included in this bundle.")} /></label>
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
            <div className="sv-report-title-row"><label>{t("Category")}<select value={change.category} onChange={event => updateChange(change.id, { category: event.target.value as ReportChange['category'] })}>{reportCategories.map(category => <option key={category.key} value={category.key}>{t(category.label)}</option>)}</select></label><label>{t("Change title")}<input data-testid={"report-change-title-"+index} value={change.title} onChange={event => updateChange(change.id, { title: event.target.value })} placeholder={t("e.g. Update mission navigation")} /></label></div>
            <label>{t("Description")}<textarea data-testid={"report-change-description-"+index} value={change.description} rows={4} onChange={event => updateChange(change.id, { description: event.target.value })} placeholder={t("Explain the interface or logic change and what the player will experience.")} /></label>
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
      <div className="sv-report-bundle-summary"><Icon name="inventory_2" /><div><h3>{t("Content bundle #")} {draft.version_no}</h3><p>{t("Report, evidence images and saved gameplay content.")}</p><span>{collections.reduce((total, collection) => total + draft.bundle[collection.key].length, 0)} {t("content records ·")} {report.changes.length} {t("reported changes ·")} {imageCount} {t("images")}</span></div><div className="sv-row-actions">{hasSaved && <ReviewPackageButton content={draft.bundle} report={report} revision={draft.revision} disabled={pending || !!uploading} />}</div></div>

  </section>;
}
