import { useTranslation } from '../preferences/preferencesContext';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Icon } from '../shared/ui';
import { evidenceService } from './evidenceService';
import { reportCategories, type ChangeReport, type EvidenceImage } from './types';
import './changeReports.css';
export function EvidencePreview({ image, caption }: { image: EvidenceImage; caption: string }) {
  const t = useTranslation();
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [expanded, setExpanded] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true, objectUrl = '';
    evidenceService.load(image).then(blob => {
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Image unavailable.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [image, retry]);
  return <>
    {url ? <button type="button" className="sv-evidence-preview" onClick={() => setExpanded(true)} aria-label={t("Expand evidence: ") + caption}><img src={url} alt={caption} /><span><Icon name="zoom_in" />{t("View image")}</span></button> : <div className="sv-evidence-placeholder" role="status">{error || 'Loading image…'}{error && <button type="button" className="sv-button sv-button-small" onClick={() => { setError(''); setRetry(retry + 1); }}>{t("Retry")}</button>}</div>}
    {expanded && <div className="sv-modal-backdrop"><section className="sv-evidence-modal" role="dialog" aria-modal="true" aria-label={t("Evidence image")} onKeyDown={e => { if (e.key === 'Escape') setExpanded(false); }}><button autoFocus type="button" className="sv-button" onClick={() => setExpanded(false)}><Icon name="close" />{t("Close image")}</button><img src={url} alt={caption} /><p>{caption}</p></section></div>}
  </>;
}
export function ReportDetails({ report, contentVersionId }: { report: ChangeReport; contentVersionId?: string }) {
  const t = useTranslation();
  const { user } = useAuth();
  return <div className="sv-report-details">
    <div className="sv-report-overview"><div><span className="sv-eyebrow">{t("Change report")}</span><p>{report.summary}</p></div><div className="sv-report-source-summary"><span><Icon name="account_tree" />{report.source.kind === 'ci' ? t("CI build") : t("Local Git")} · {report.source.branch}</span><code>{report.source.commit.slice(0, 12)}</code>{report.source.build_id && user?.role === 'admin' && <Link to={'/admin/reviews?source=game&build=' + encodeURIComponent(report.source.build_id) + (contentVersionId ? '&draft=' + encodeURIComponent(contentVersionId) : '')}>{t("View source build")}<Icon name="arrow_outward" /></Link>}</div></div>
    {report.changes.map((change, index) => {
      const category = reportCategories.find(category => category.key === change.category);
      return <article className="sv-report-review-card" key={change.id}><div className="sv-report-change-header"><span><Icon name={category?.icon || 'folder'} />{category?.label}</span><small>{t("Change")} {index + 1}</small></div><div className={'sv-report-review-body ' + (change.image ? 'has-image' : '')}><div><h3>{change.title}</h3>{change.path && <code className="sv-report-path">{change.path}</code>}<p>{change.description}</p>{change.previous_behavior && <div className="sv-report-extra"><strong>{t("Previous behavior")}</strong><p>{change.previous_behavior}</p></div>}{change.verification && <div className="sv-report-extra"><strong>{t("Verification")}</strong><p>{change.verification}</p></div>}</div>{change.image && <figure><EvidencePreview key={change.image.id} image={change.image} caption={change.image_caption || change.title} /><figcaption>{change.image_caption || change.image.file_name}</figcaption></figure>}</div></article>;
    })}
  </div>;
}
