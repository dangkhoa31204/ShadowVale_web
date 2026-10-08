import { useEffect, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { useWorkspace } from './workspaceContext';
import { collections, type CollectionKey, type ContentBundle, type ContentRecord, type Draft } from './types';
import { validateBundle } from './workspaceService';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';

function DraftEditor({ draft }: { draft: Draft }) {
  const { user } = useAuth(), { busy, execute } = useWorkspace(), toast = useToast();
  const [bundle, setBundle] = useState<ContentBundle>(() => structuredClone(draft.bundle));
  const [title, setTitle] = useState(draft.title);
  const [category, setCategory] = useState<CollectionKey | 'ai_settings'>('weapons');
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false), [parseError, setParseError] = useState('');
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || !!parseError) && currentLocation.pathname !== nextLocation.pathname);
  const [search, setSearch] = useState('');
  const errors = validateBundle(bundle);
  const editable = ['draft', 'changes_requested'].includes(draft.status) && user?.role === 'designer' && draft.authorId === user.id;
  const record = category === 'ai_settings' ? bundle.ai_settings : bundle[category][selected];
  useEffect(() => {
    if (!dirty && !parseError) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, parseError]);
  function chooseCategory(key: CollectionKey | 'ai_settings') {
    if (parseError) { toast.error('Fix the JSON syntax before switching content.'); return; }
    setCategory(key); setSelected(0); setSearch('');
  }
  function updateRecord(value: ContentRecord) {
    setBundle(prev => category === 'ai_settings' ? { ...prev, ai_settings: value } : { ...prev, [category]: prev[category].map((r, i) => i === selected ? value : r) });
    setDirty(true);
  }
  function duplicate() {
    if (category === 'ai_settings') return;
    const base = structuredClone(bundle[category][selected] || draft.bundle[category][0]);
    if (!base) { toast.error('Use the JSON bundle editor to add the first record in an empty collection.'); return; }
    const ids = new Set(bundle[category].map(r => r.id));
    let n = 1; while (ids.has(String(base.id) + '_copy_' + n)) n++;
    base.id = String(base.id) + '_copy_' + n;
    if (base.display_name) base.display_name = 'New ' + collections.find(c => c.key === category)?.label.toLowerCase().replace(/s$/, '');
    setBundle(prev => ({ ...prev, [category]: [...prev[category], base] }));
    setSelected(bundle[category].length); setDirty(true);
  }
  async function save(submit = false) {
    if (parseError) { toast.error(parseError); return; }
    try {
      let current = draft;
      if (dirty) {
        const next = await execute({ type: 'saveDraft', id: draft.id, revision: draft.revision, title, bundle });
        current = next.drafts.find(d => d.id === draft.id)!;
      }
      if (submit) await execute({ type: 'submitDraft', id: current.id, revision: current.revision });
      setDirty(false);
    } catch { /* Provider displays the error. */ }
  }
  return <div className="sv-editor">
    {blocker.state === 'blocked' && <div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-labelledby="unsaved-title"><h2 id="unsaved-title">Leave unsaved changes?</h2><p>Save your draft before switching pages, or discard the changes to continue.</p><div><button className="sv-button" onClick={() => blocker.reset()}>Keep editing</button><button className="sv-button sv-button-danger" onClick={() => blocker.proceed()}>Discard & leave</button></div></section></div>}
    <div className="sv-editor-toolbar"><div><Status value={draft.status} /><span className="sv-mono">REV {draft.revision}</span>{dirty && <span className="sv-unsaved">Unsaved changes</span>}</div><div>{editable && <><button className="sv-button" disabled={busy || !dirty || !!parseError} onClick={() => save()}><Icon name="save" />Save draft</button><button className="sv-button sv-button-primary" disabled={busy || errors.length > 0 || !!parseError} onClick={() => save(true)}><Icon name="send" />Submit for review</button></>}</div></div>
    {draft.note && <div className="sv-alert"><strong>Review feedback</strong><p>{draft.note}</p></div>}
    {!editable && <div className="sv-alert">This snapshot is locked while {draft.status.replaceAll('_', ' ')}. Create a new draft from a published version to make changes.</div>}
    <div className="sv-editor-meta sv-form"><label>Draft title<input value={title} disabled={!editable} onChange={e => { setTitle(e.target.value); setDirty(true); }} /></label><label>Bundle version<input value={bundle.bundle_version} disabled={!editable} onChange={e => { setBundle({ ...bundle, bundle_version: e.target.value }); setDirty(true); }} /></label><div><small>Schema</small><strong>v1 · Unity content contract</strong></div></div>
    <div className="sv-content-tabs" role="tablist" aria-label="Content type">{collections.map(c => <button role="tab" aria-selected={category === c.key} key={c.key} className={category === c.key ? 'is-active' : ''} onClick={() => chooseCategory(c.key)}><Icon name={c.icon} />{c.label}<span>{bundle[c.key].length}</span></button>)}<button role="tab" aria-selected={category === 'ai_settings'} className={category === 'ai_settings' ? 'is-active' : ''} onClick={() => chooseCategory('ai_settings')}><Icon name="neurology" />AI settings</button></div>
    <div className="sv-content-columns">{category !== 'ai_settings' && <aside className="sv-records"><div className="sv-records-heading"><strong>{collections.find(c => c.key === category)?.label}</strong>{editable && <button title="Duplicate record" aria-label="Duplicate record" onClick={duplicate} disabled={!!parseError}><Icon name="add" /></button>}</div><label className="sv-search"><Icon name="search" /><input aria-label="Search content" placeholder="Search content…" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <div>{bundle[category].map((r, i) => ({ r, i })).filter(({ r }) => String(r.display_name || r.title || r.id).toLowerCase().includes(search.toLowerCase())).map(({ r, i }) => <button key={i} className={'sv-record ' + (i === selected ? 'is-active' : '')} onClick={() => { if (!parseError) setSelected(i); }}><span><strong>{String(r.display_name || r.title || r.id)}</strong><small>{String(r.id)}</small></span><Icon name="chevron_right" /></button>)}</div>
    </aside>}<div className="sv-record-detail">{record ? <RecordEditor key={category + ':' + selected} record={record} editable={editable} onChange={updateRecord} onError={setParseError} /> : <Empty title="No records" description="Import a complete bundle below to add records to this collection." />}
      {editable && category !== 'ai_settings' && record && <button className="sv-button sv-button-danger" disabled={!!parseError} onClick={() => {
        if (!window.confirm('Remove this record from the draft? References will be checked before submission.')) return;
        setBundle({ ...bundle, [category]: bundle[category].filter((_, i) => i !== selected) }); setSelected(0); setDirty(true);
      }}>Remove record</button>}
    </div></div>
    <div className={'sv-validation ' + (errors.length || parseError ? 'has-errors' : '')}><Icon name={errors.length || parseError ? 'error' : 'verified'} /><div><strong>{errors.length || parseError ? 'Resolve validation issues before submitting' : 'Bundle passes schema & reference validation'}</strong><p>{errors.length || parseError ? 'Drafts may be saved with schema issues. Publishing requires a valid bundle.' : 'Schema v1, unique IDs, item references and navigation nodes checked.'}</p>{(errors.length > 0 || parseError) && <ul>{[...(parseError ? [parseError] : []), ...errors].slice(0, 12).map((e, i) => <li key={i}>{e}</li>)}</ul>}</div></div>
    {editable && <details className="sv-bundle-import"><summary>Import a complete JSON bundle</summary><p>Replace the current draft data with an exported schema v1 bundle.</p><input aria-label="Import JSON bundle" type="file" accept=".json,application/json" onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return;
      try {
        const imported: unknown = JSON.parse(await file.text()), issues = validateBundle(imported);
        if (issues.length) throw new Error(issues.slice(0, 3).join('; '));
        if (!window.confirm('Replace this draft with the imported bundle?')) return;
        setBundle(imported as ContentBundle); setCategory('weapons'); setSelected(0); setParseError(''); setDirty(true);
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not import bundle.'); }
    }} /></details>}
  </div>;
}
function RecordEditor({ record, editable, onChange, onError }: { record: ContentRecord; editable: boolean; onChange: (r: ContentRecord) => void; onError: (s: string) => void }) {
  const [raw, setRaw] = useState(() => JSON.stringify(record, null, 2));
  // Scalar form follows the parent record; raw JSON can temporarily have syntax errors.
  function field(key: string, value: ContentRecord[string]) {
    const next = { ...record, [key]: value }; setRaw(JSON.stringify(next, null, 2)); onError(''); onChange(next);
  }
  return <><div className="sv-record-title"><div><span className="sv-eyebrow">CONTENT RECORD</span><h2>{String(record.display_name || record.title || record.id || 'AI settings')}</h2></div><span className="sv-mono">JSON / V1</span></div>
    <div className="sv-field-grid sv-form">{Object.entries(record).filter(([, v]) => v === null || typeof v !== 'object').map(([key, value]) => <label key={key}>{key.replaceAll('_', ' ')}{typeof value === 'boolean' ? <select disabled={!editable} value={String(value)} onChange={e => field(key, e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select> : <input disabled={!editable} type={typeof value === 'number' ? 'number' : 'text'} step="any" value={String(value ?? '')} onChange={e => field(key, typeof value === 'number' ? Number(e.target.value) : e.target.value)} />}</label>)}</div>
    <details className="sv-json-editor" open={Object.values(record).some(v => Array.isArray(v))}><summary>Advanced JSON · nested values & all fields</summary><textarea aria-label="Record JSON" spellCheck={false} disabled={!editable} value={raw} onChange={e => {
      const value = e.target.value; setRaw(value);
      try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Record must be a JSON object.');
        onError(''); onChange(parsed as ContentRecord);
      } catch (e) { onError('JSON syntax: ' + (e instanceof Error ? e.message : 'invalid JSON')); }
    }} /></details></>;
}
export function ContentPage() {
  const { state, execute, busy } = useWorkspace(), { user } = useAuth();
  const { draftId } = useParams(), navigate = useNavigate();
  const [newTitle, setNewTitle] = useState(''), [creating, setCreating] = useState(false);
  const drafts = state.drafts.filter(d => d.authorId === user?.id);
  const selected = draftId ? drafts.find(d => d.id === draftId) : drafts.find(d => ['draft', 'changes_requested'].includes(d.status)) || drafts[0];
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const next = await execute({ type: 'createDraft', title: newTitle });
      setCreating(false); setNewTitle(''); navigate('/admin/content/' + next.drafts[0].id);
    } catch { /* Provider displays the error. */ }
  }
  return <div className="sv-page"><PageHeading eyebrow="DESIGNER WORKSPACE" title="Content authoring" description="Tune game content in a draft. Validate it, then send it for admin review." action={<button className="sv-button sv-button-primary" onClick={() => setCreating(!creating)}><Icon name="add" />New draft</button>} />
    {creating && <form className="sv-inline-form sv-panel sv-form" onSubmit={create}><label>Draft title<input required autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Map 02 balance pass" /></label><button className="sv-button sv-button-primary" disabled={busy}>Create from active version</button><button className="sv-button" type="button" onClick={() => setCreating(false)}>Cancel</button></form>}
    <div className="sv-draft-picker">{drafts.map(d => <Link key={d.id} to={'/admin/content/' + d.id} className={selected?.id === d.id ? 'is-active' : ''}><span>{d.title}</span><Status value={d.status} /></Link>)}</div>
    {selected ? <DraftEditor key={selected.id + ':' + selected.revision} draft={selected} /> : <Empty title={draftId ? 'Draft not found' : 'Start your first draft'} description="Create a draft from the active content bundle to begin authoring." />}
  </div>;
}
