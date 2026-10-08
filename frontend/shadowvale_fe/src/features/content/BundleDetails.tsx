import { useState } from 'react';
import { collections, type ContentBundle } from './types';
import { compareBundles } from './validation';
import { Empty } from '../shared/ui';

const sections = [...collections, { key: 'ai_settings', label: 'AI settings' }] as const;
const metadata = ['/bundle_version', '/checksum', '/published_at'];
export function BundleDetails({ before, after }: { before?: ContentBundle; after: ContentBundle }) {
  const [view, setView] = useState<'changes' | 'content'>(before ? 'changes' : 'content');
  const [section, setSection] = useState('all');
  const changes = before ? compareBundles(before, after).filter(d => !metadata.includes(d.path)) : [];
  const visibleChanges = changes.filter(d => section === 'all' || d.path === '/' + section || d.path.startsWith('/' + section + '/'));
  return <div className="sv-bundle-details">
    <div className="sv-detail-toolbar">
      <div className="sv-detail-tabs" role="group" aria-label="Content view">
        {before && <button className={view === 'changes' ? 'is-active' : ''} aria-pressed={view === 'changes'} onClick={() => setView('changes')}>Changes ({changes.length})</button>}
        <button className={view === 'content' ? 'is-active' : ''} aria-pressed={view === 'content'} onClick={() => setView('content')}>Full content</button>
      </div>
      <label className="sv-detail-filter">Section<select value={section} onChange={e => setSection(e.target.value)}><option value="all">All sections</option>{sections.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
    </div>
    {view === 'changes' ? <>
      <div className="sv-diff-columns"><span>Before · v{before?.bundle_version}</span><span>After · v{after.bundle_version}</span></div>
      {visibleChanges.length ? <div className="sv-diff-list">{visibleChanges.map(d => <div className="sv-diff" key={d.path}><strong className="sv-mono">{d.path} <span className="sv-change-kind">{d.before === undefined ? 'Added' : d.after === undefined ? 'Removed' : 'Updated'}</span></strong><div><pre className="sv-diff-before">{JSON.stringify(d.before, null, 2) ?? '—'}</pre><pre className="sv-diff-after">{JSON.stringify(d.after, null, 2) ?? '—'}</pre></div></div>)}</div> : <Empty title="No content changes" />}
    </> : <div className="sv-snapshot">{sections.filter(s => section === 'all' || s.key === section).map(s => {
      const content = after[s.key];
      return <details key={s.key} open={section !== 'all'}><summary>{s.label}<span>{Array.isArray(content) ? content.length : ''}</span></summary><pre>{JSON.stringify(content, null, 2)}</pre></details>;
    })}</div>}
  </div>;
}
