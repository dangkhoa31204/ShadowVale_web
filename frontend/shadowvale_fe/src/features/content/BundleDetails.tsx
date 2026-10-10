import { useTranslation } from '../preferences/preferencesContext';
import { useState } from 'react';
import { collections, type CollectionKey, type ContentBundle } from './types';
import { collectionIdentity, recordLabel, schemaFields } from './schemaFields';
import { compareBundles } from './validation';
import { Empty } from '../shared/ui';

const sections = collections;
const metadata = ['/version_no', '/label', '/changelog', '/content_version_id', '/checksum', '/published_at'];
function changeLabel(path: string, before: ContentBundle | undefined, after: ContentBundle) {
  const [, key, identity, field] = path.split('/');
  const collection = collections.find(collection => collection.key === key);
  if (!collection) return path;
  const rows = [...after[collection.key], ...(before?.[collection.key] || [])];
  const record = rows.find(row => collectionIdentity[collection.key].map(key => String(row[key])).join(':') === identity);
  const fieldLabel = schemaFields[collection.key].find(definition => definition.key === field)?.label;
  return [collection.label, record ? recordLabel(collection.key, record, after) : identity, fieldLabel || field].filter(Boolean).join(' · ');
}
function displayValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}
export function BundleDetails({ before, after }: { before?: ContentBundle; after: ContentBundle }) {
  const t = useTranslation();
  const [view, setView] = useState<'changes' | 'content'>(before ? 'changes' : 'content');
  const [section, setSection] = useState('all');
  const changes = before ? compareBundles(before, after).filter(d => !metadata.includes(d.path) && !['api_id', 'content_version_id', 'created_at', 'updated_at'].includes(d.path.split('/').at(-1) || '')) : [];
  const visibleChanges = changes.filter(d => section === 'all' || d.path === '/' + section || d.path.startsWith('/' + section + '/'));
  return <div className="sv-bundle-details">
    <div className="sv-detail-toolbar">
      <div className="sv-detail-tabs" role="group" aria-label={t("Content view")}>
        {before && <button className={view === 'changes' ? 'is-active' : ''} aria-pressed={view === 'changes'} onClick={() => setView('changes')}>{t("Changes (")} {changes.length})</button>}
        <button className={view === 'content' ? 'is-active' : ''} aria-pressed={view === 'content'} onClick={() => setView('content')}>{t("Full content")}</button>
      </div>
      <label className="sv-detail-filter">{t("Section")}<select value={section} onChange={e => setSection(e.target.value)}><option value="all">{t("All sections")}</option>{sections.map(s => <option key={s.key} value={s.key}>{t(s.label)}</option>)}</select></label>
    </div>
    {view === 'changes' ? <>
      <div className="sv-diff-columns"><span>{t("Before · Version #")} {before?.version_no}</span><span>{t("After · Version #")} {after.version_no}</span></div>
      {visibleChanges.length ? <div className="sv-diff-list">{visibleChanges.map(d => <div className="sv-diff" key={d.path}><strong>{changeLabel(d.path, before, after)} <span className="sv-change-kind">{d.before === undefined ? t("Added") : d.after === undefined ? t("Removed") : t("Updated")}</span></strong><small className="sv-diff-path sv-mono">{d.path}</small><div><pre className="sv-diff-before">{displayValue(d.before)}</pre><pre className="sv-diff-after">{displayValue(d.after)}</pre></div></div>)}</div> : <Empty title={t("No content changes")} />}
    </> : <div className="sv-snapshot">{sections.filter(s => section === 'all' || s.key === section).map(s => {
      const content = after[s.key];
      return <details key={s.key} open={section !== 'all'}><summary>{t(s.label)}<span>{content.length}</span></summary><div className="sv-snapshot-records">{content.map((record, index) => <details key={index}><summary>{recordLabel(s.key, record, after)}</summary><dl>{schemaFields[s.key as CollectionKey].filter(field => Object.hasOwn(record, field.key) && !['content_version_id', 'created_at', 'updated_at'].includes(field.key)).map(field => <div key={field.key}><dt>{t(field.label)}</dt><dd>{typeof record[field.key] === 'object' && record[field.key] !== null ? <pre>{displayValue(record[field.key])}</pre> : displayValue(record[field.key])}</dd></div>)}</dl></details>)}{!content.length && <Empty title={t("No records")} />}</div></details>;
    })}</div>}
  </div>;
}
