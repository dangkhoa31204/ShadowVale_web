import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import type { ContentBundle } from '../content/types';
import { Icon } from '../shared/ui';
import { evidenceService } from './evidenceService';
import type { ChangeReport } from './types';
function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not export an evidence image.'));
    reader.readAsDataURL(blob);
  });
}
export function ReviewPackageButton({ content, report, revision, disabled }: { content: ContentBundle; report: ChangeReport; revision: number; disabled?: boolean }) {
  const [loading, setLoading] = useState(false), [url, setUrl] = useState(''), toast = useToast();
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function prepare() {
    setLoading(true);
    try {
      const images = await Promise.all(report.changes.filter(change => change.image).map(async change => ({ ...change.image!, data_uri: await dataUrl(await evidenceService.load(change.image!)) })));
      const value = { package_schema: 'shadowvale-review/1.0', content_version_no: content.version_no, revision, report, content, evidence_images: images };
      if (active.current) setUrl(URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })));
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not export the review package.'); }
    finally { if (active.current) setLoading(false); }
  }
  return <><button className="sv-button sv-button-small" disabled={disabled || loading} onClick={() => void prepare()}><Icon name="download" />{loading ? 'Preparing package…' : 'Review package'}</button>
    {url && <div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-label="Review package" onKeyDown={event => { if (event.key === 'Escape') setUrl(''); }}><h2>Review package #{content.version_no}</h2><p>Revision {revision} · {report.changes.length} changes · {report.changes.filter(change => change.image).length} evidence images</p><p>Includes the report, images and gameplay content.</p><div><button autoFocus className="sv-button" onClick={() => setUrl('')}>Close</button><a className="sv-button sv-button-primary" href={url} download={'shadowvale-review-' + content.version_no + '.json'}>Download review JSON</a></div></section></div>}
  </>;
}
