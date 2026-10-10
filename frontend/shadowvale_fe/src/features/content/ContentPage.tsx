import { useTranslation } from '../preferences/preferencesContext';
import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { useWorkspace } from './workspaceContext';
import { collections, type CollectionKey, type ContentBundle, type ContentRecord, type Draft, type JsonValue } from './types';
import { collectionIdentity, createContentRecord, recordIdentity, recordLabel, schemaFields, type FieldDefinition } from './schemaFields';
import { validateBundle } from './workspaceService';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { NumericControl } from '../shared/NumericControl';
import { validateChangeReport } from '../changeReports/reportValidation';
import './editor.css';
import { isDemoMode } from '../../config/environment';
import { apiFields, validateEditor, rebindEditorImport } from './apiModel';
import { contentApi } from './contentApi';
import { errorMessage } from '../../services/api/errors';
import { editorFieldErrors } from './apiFieldErrors';
import type { EnumsDto } from '../../services/api/contracts';

function referenceOptions(field: FieldDefinition, bundle: ContentBundle) {
  if (!field.reference) return [];
  const { collection, filter, valueField = 'code' } = field.reference;
  return bundle[collection].filter(row => !filter || row[filter.field] === filter.value).map(row => ({
    value: String(row[valueField] ?? ''), label: recordLabel(collection, row, bundle),
  })).filter(option => option.value);
}

/** Choose real FK values for relation keys instead of adding a made-up *_copy item code. */
function newRecord(collection: CollectionKey, bundle: ContentBundle, source?: ContentRecord): ContentRecord {
  const candidate = source ? structuredClone(source) : createContentRecord(collection, bundle);
  delete candidate.api_id;
  const keys = collectionIdentity[collection];
  const existing = new Set(bundle[collection].map(row => recordIdentity(collection, row)));
  if (keys.includes('id')) candidate.id = crypto.randomUUID();
  if (keys.includes('code')) {
    const stem = String(candidate.code || collection.replace(/s$/, '')).replace(/[^a-z0-9_]/g, '_').replace(/^[^a-z]+/, 'record_');
    let n = 1;
    while (source || existing.has(recordIdentity(collection, candidate))) {
      candidate.code = `${stem}_${source ? 'copy_' : ''}${n++}`;
      if (!existing.has(recordIdentity(collection, candidate))) break;
    }
    if (source && typeof candidate.name === 'string') candidate.name += ' copy';
    if (source && typeof candidate.title === 'string') candidate.title += ' copy';
  }
  const fields = schemaFields[collection];
  for (const field of fields.filter(field => field.type === 'reference' && field.required)) {
    if (!referenceOptions(field, bundle).length) throw new Error(`Add ${collections.find(c => c.key === field.reference?.collection)?.label.toLowerCase()} before creating this record.`);
  }
  if (!existing.has(recordIdentity(collection, candidate))) return candidate;
  const choices = keys.map(key => {
    const field = fields.find(field => field.key === key);
    if (!field) return [candidate[key]];
    if (field.type === 'reference') return referenceOptions(field, bundle).map(option => option.value);
    if (field.type === 'enum') return field.options ?? [];
    if (field.type === 'number') return Array.from({ length: Math.min(20, (field.max ?? (field.min ?? 0) + 19) - (field.min ?? 0) + 1) }, (_, i) => (field.min ?? 0) + i);
    return [candidate[key], ...Array.from({ length: 20 }, (_, i) => `${String(candidate[key] || 'default')}_copy_${i + 1}`)];
  });
  let attempts = 0;
  function find(index: number): boolean {
    if (++attempts > 10000) return false;
    if (index === keys.length) return !existing.has(recordIdentity(collection, candidate));
    for (const value of choices[index]) { candidate[keys[index]] = value; if (find(index + 1)) return true; }
    return false;
  }
  if (!find(0)) throw new Error('All available relations are already used. Add another related record first.');
  return candidate;
}

function DraftEditor({ draft, enums }: { draft: Draft; enums?: EnumsDto }) {
  const t = useTranslation();
  const { user } = useAuth(), { busy, execute, reload } = useWorkspace(), toast = useToast();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<ContentBundle>(() => structuredClone(draft.bundle));
  const [label, setLabel] = useState(draft.label || draft.title), [changelog, setChangelog] = useState(draft.changelog || '');
  const [category, setCategory] = useState<CollectionKey>('weapons'), [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false), [parseError, setParseError] = useState(''), [search, setSearch] = useState('');
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || !!parseError) && currentLocation.pathname !== nextLocation.pathname);
  const [apiError, setApiError] = useState('');
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const errors = [...(!label.trim() ? ['Enter a version label.'] : []), ...(isDemoMode ? [...validateBundle(bundle), ...validateChangeReport(draft.changeReport)] : validateEditor(bundle))];
  const submitErrors = [...(parseError ? [parseError] : []), ...errors];
  const [showValidation, setShowValidation] = useState(false);
  const validationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showValidation) {
      validationRef.current?.focus({ preventScroll: true });
      validationRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [showValidation]);
  const owner = user?.role === 'designer' && draft.authorId === user.id;
  const editable = (draft.status === 'draft' || (!isDemoMode && draft.status === 'rejected')) && owner;
  const record = bundle[category][selected];
  const categoryInfo = collections.find(collection => collection.key === category)!;
  useEffect(() => {
    if (!dirty && !parseError) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, parseError]);
  function chooseCategory(key: CollectionKey) {
    if (parseError) { toast.error('Resolve the field error before switching content.'); return; }
    setCategory(key); setSelected(0); setSearch('');
  }
  function updateRecord(value: ContentRecord) {
    setBundle(prev => ({ ...prev, [category]: prev[category].map((row, i) => i === selected ? value : row) })); setDirty(true);
  }
  function addRecord(duplicate = false) {
    try {
      const added = newRecord(category, bundle, duplicate ? record : undefined);
      setBundle(prev => ({ ...prev, [category]: [...prev[category], added] })); setSelected(bundle[category].length); setSearch(''); setDirty(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add record.'); }
  }
  async function save(submit = false) {
    if (busy) return;
    if (submit && submitErrors.length) {
      setShowValidation(true);
      validationRef.current?.focus();
      return;
    }
    if (parseError) { toast.error(parseError); return; }
    if (!label.trim()) { toast.error('Enter a version label.'); return; }
    if (!isDemoMode && errors.length) { setApiError(errors.join('\n')); return; }
    setApiError(''); setServerFields({});
    try {
      let current = draft;
      if (dirty) {
        const next = await execute({ type: 'saveDraft', id: draft.id, revision: draft.revision, title: label, label, changelog, bundle });
        current = next.drafts.find(version => version.id === draft.id)!;
      }
      if (submit) await execute({ type: 'submitDraft', id: current.id, revision: current.revision });
      setDirty(false);
    } catch (error) { setApiError(errorMessage(error)); setServerFields(editorFieldErrors(error, bundle)); }
  }
  return <div className="sv-editor">
    {blocker.state === 'blocked' && <div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-labelledby="unsaved-title"><h2 id="unsaved-title">{t("Leave unsaved changes?")}</h2><p>{t("Save this version or discard your changes.")}</p><div><button className="sv-button" onClick={() => blocker.reset()}>{t("Keep editing")}</button><button className="sv-button sv-button-danger" onClick={() => blocker.proceed()}>{t("Discard & leave")}</button></div></section></div>}
    <div className="sv-editor-toolbar"><div><Status value={draft.status} /><span className="sv-mono">{t("Revision")} {draft.revision}</span>{dirty && <span className="sv-unsaved">{t("Unsaved changes")}</span>}</div><div>
      <Link className="sv-button" to={'/admin/change-reports/' + draft.id}><Icon name="description" />{t("Change report")}</Link>
      {!isDemoMode && draft.status === 'rejected' && owner && <button className="sv-button" disabled={busy} onClick={()=>void execute({type:'createDraft',title:label+' revision',label:label+' revision',sourceReleaseId:draft.id}).then(workspace=>navigate('/admin/content/'+workspace.drafts[0].id)).catch(()=>{})}>{t("Clone returned version")}</button>}
      {isDemoMode && draft.status === 'rejected' && owner && <button className="sv-button sv-button-primary" disabled={busy} onClick={() => { void execute({ type: 'editRejectedDraft', id: draft.id, revision: draft.revision }).catch(() => {}); }}><Icon name="edit" />{t("Resume draft")}</button>}
      {editable && <>{!isDemoMode && <button className="sv-button" disabled={busy || validating || dirty || !!parseError || draft.status === 'rejected'} onClick={async () => { setValidating(true); try { const report = await contentApi.validate(draft.id, draft.revision); if(report.isValid)toast.success('Validation passed.'); setApiError(report.isValid ? 'Validation passed.' : report.errors.map(i => i.path + ': ' + i.message).join('\n')); await reload(); } catch (e) { setApiError(errorMessage(e)); } finally { setValidating(false); } }}>{t("Validate saved content")}</button>}<button className="sv-button" disabled={busy || !dirty || !!parseError || !label.trim()} onClick={() => save()}><Icon name="save" />{t("Save draft")}</button><button className="sv-button sv-button-primary" disabled={busy || (!isDemoMode && draft.status === 'rejected' && !dirty)} aria-describedby={showValidation && submitErrors.length ? 'content-submit-errors' : undefined} onClick={() => save(true)}><Icon name="send" />{t("Submit for review")}</button></>}
    </div></div>
    {apiError && <div className={'sv-alert ' + (apiError === 'Validation passed.' ? 'sv-alert-success' : 'sv-alert-error')} role={apiError === 'Validation passed.' ? 'status' : 'alert'} style={{ whiteSpace: 'pre-wrap' }}>{apiError}</div>}
    {!isDemoMode && draft.status === 'rejected' && <div className="sv-alert">{t("Change a content record and save to return to Draft, or clone this version.")}</div>}
    {editable && showValidation && submitErrors.length > 0 && <div ref={validationRef} id="content-submit-errors" className="sv-alert sv-alert-error" role="alert" tabIndex={-1}><strong>{t("Check this content before sending")}</strong><ul style={{ listStyle: 'disc', paddingLeft: 20, marginTop: 8 }}>{submitErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>{validateChangeReport(draft.changeReport).length > 0 && <Link to={'/admin/change-reports/' + draft.id}>{t("Complete change report")}</Link>}</div>}
    {!!draft.validation_errors?.length && <div className="sv-alert sv-alert-error" role="alert"><strong>{t("BE validation")}</strong>{draft.validation_errors.map((message,i)=><p key={i}>{message}</p>)}</div>}
    {draft.note && <div className="sv-alert"><strong>{t("Review note")}</strong><p>{draft.note}</p></div>}
    {!editable && <div className="sv-alert">{draft.status === 'rejected' && owner ? t("Resume this draft to make the requested changes.") : t("This content version is read-only.")}</div>}
    <div className="sv-editor-meta sv-form">
      <label>{t("Version label")}<input maxLength={200} aria-invalid={!!serverFields['meta:label']} value={label} disabled={!editable} onChange={event => { setLabel(event.target.value); setBundle({ ...bundle, label: event.target.value }); setDirty(true); }} /><small role="alert">{serverFields['meta:label']}</small></label>
      <div className="sv-version-number"><small>{t("Version number")}</small><strong>#{draft.version_no}</strong></div><div><small>{t("Schema version")}</small><strong>{bundle.schema_version}</strong></div>
      <label className="sv-changelog">{t("Changelog")}<textarea rows={2} maxLength={4000} aria-invalid={!!serverFields['meta:changelog']} value={changelog} disabled={!editable} placeholder={t("What changed in this version?")} onChange={event => { setChangelog(event.target.value); setBundle({ ...bundle, changelog: event.target.value }); setDirty(true); }} /><small role="alert">{serverFields['meta:changelog']}</small></label>
    </div>
    <div className="sv-content-tabs" role="tablist" aria-label={t("Content table")}>{collections.map(collection => <button role="tab" aria-selected={category === collection.key} key={collection.key} className={category === collection.key ? 'is-active' : ''} onClick={() => chooseCategory(collection.key)}><Icon name={collection.icon} />{t(collection.label)}<span>{bundle[collection.key].length}</span></button>)}</div>
    <div className="sv-content-columns"><aside className="sv-records"><div className="sv-records-heading"><strong>{t(categoryInfo.label)}</strong>{editable && <button title={t("New record")} aria-label={t("New record")} onClick={() => addRecord()} disabled={!!parseError}><Icon name="add" /></button>}</div>
      <label className="sv-search"><Icon name="search" /><input aria-label={t("Search content")} placeholder={t("Search records…")} value={search} onChange={event => setSearch(event.target.value)} /></label>
      <div>{bundle[category].map((row, i) => ({ row, i })).filter(({ row }) => `${recordLabel(category, row, bundle)} ${recordIdentity(category, row)}`.toLowerCase().includes(search.toLowerCase())).map(({ row, i }) => <button key={i} className={'sv-record ' + (i === selected ? 'is-active' : '')} onClick={() => { if (!parseError) setSelected(i); }}><span><strong>{recordLabel(category, row, bundle)}</strong><small>{recordIdentity(category, row)}</small></span><Icon name="chevron_right" /></button>)}</div>
    </aside><div className="sv-record-detail">{record ? <RecordEditor key={category + ':' + selected} collection={category} bundle={bundle} record={record} editable={editable} enums={enums} serverErrors={Object.fromEntries(Object.entries(serverFields).filter(([key]) => key.startsWith(category + ':' + selected + ':')).map(([key, message]) => [key.split(':').at(-1)!, message]))} onChange={updateRecord} onError={setParseError} /> : <Empty title={t("No records")} description={t('Add a record to this version: {collection}.', { collection: t(categoryInfo.label).toLowerCase() })} />}
      {editable && <div className="sv-record-actions">{record ? <><button className="sv-button" disabled={!!parseError} onClick={() => addRecord(true)}><Icon name="content_copy" />{t("Duplicate record")}</button><button className="sv-button sv-button-danger" disabled={!!parseError} onClick={() => {
        if (!window.confirm(t('Remove this record? Related references must be updated before submitting.'))) return;
        setBundle({ ...bundle, [category]: bundle[category].filter((_, i) => i !== selected) }); setSelected(0); setDirty(true);
      }}><Icon name="delete" />{t("Remove record")}</button></> : <button className="sv-button sv-button-primary" onClick={() => addRecord()}><Icon name="add" />{t("Add record")}</button>}</div>}
    </div></div>
    <div className={'sv-validation ' + (errors.length || parseError ? 'has-errors' : '')}><Icon name={errors.length || parseError ? 'error' : 'verified'} /><div><strong>{errors.length || parseError ? t("Check content before submitting") : t("Content is ready for review")}</strong>{(errors.length > 0 || parseError) && <ul>{[...(parseError ? [parseError] : []), ...errors].slice(0, 12).map((error, i) => <li key={i}>{error}</li>)}</ul>}</div></div>
    {editable && <details className="sv-bundle-import"><summary>{t("Import editor JSON")}</summary><input aria-label={t("Import JSON bundle")} type="file" accept=".json,application/json" onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try {
        const imported: unknown = JSON.parse(await file.text());
        if (!imported || typeof imported !== 'object' || !collections.every(c => Array.isArray((imported as ContentBundle)[c.key]))) throw new Error('Choose an editor JSON file with all 14 content lists. Only the JSON downloaded from the BE is an authoritative validated runtime bundle.');
        const issues = isDemoMode ? validateBundle(imported) : validateEditor(imported as ContentBundle);
        if (issues.length) throw new Error(issues.slice(0, 3).join('; '));
        if (!window.confirm('Replace this draft content with the imported records?')) return;
        const data = isDemoMode ? imported as ContentBundle : rebindEditorImport(imported as ContentBundle, bundle);
        const contentId = bundle.content_version_id || draft.id;
        for (const collection of collections) for (const row of data[collection.key]) {
          if (Object.hasOwn(row, 'content_version_id')) row.content_version_id = contentId;
        }
        delete data.checksum; delete data.published_at;
        setBundle({ ...data, content_version_id: contentId, version_no: bundle.version_no, schema_version: bundle.schema_version, label, changelog });
        setCategory('weapons'); setSelected(0); setParseError(''); setDirty(true);
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not import content.'); }
    }} /></details>}
  </div>;
}

function StringArrayField({ field, value, disabled, onChange }: { field: FieldDefinition; value: JsonValue; disabled: boolean; onChange: (value: JsonValue) => void }) {
  const t = useTranslation();
  const current = Array.isArray(value) ? value.join(', ') : '';
  const [edit, setEdit] = useState({ current, text: current });
  if (edit.current !== current) setEdit({ current, text: current });
  return <label>{t(field.label)}<input value={edit.text} disabled={disabled} placeholder={t("Separate codes with commas")} onChange={event => {
    const text = event.target.value, values = text.split(',').map(item => item.trim()).filter(Boolean);
    setEdit({ current: values.join(', '), text }); onChange(values);
  }} /><small className="sv-field-help">{t("Comma-separated values")}</small></label>;
}

function RecordEditor({ collection, bundle, record, editable, enums, serverErrors, onChange, onError }: { collection: CollectionKey; bundle: ContentBundle; record: ContentRecord; editable: boolean; enums?: EnumsDto; serverErrors: Record<string, string>; onChange: (row: ContentRecord) => void; onError: (message: string) => void }) {
  const t = useTranslation();
  const [raw, setRaw] = useState(() => JSON.stringify(record, null, 2));
  const [formRevision, setFormRevision] = useState(0);
  const fieldErrors = useRef<Record<string, string>>({});
  function report(key: string, message: string) {
    fieldErrors.current[key] = message;
    onError(Object.entries(fieldErrors.current).filter(([, message]) => message).map(([key, message]) => key + ': ' + message).join(' '));
  }
  function field(key: string, value: JsonValue) {
    const next = { ...record, [key]: value }; setRaw(JSON.stringify(next, null, 2)); report('JSON', ''); report(key, ''); onChange(next);
  }
  const definitions = (isDemoMode ? schemaFields[collection] : apiFields(collection, enums)).map(f => ({ ...f, readOnly: f.readOnly || (!isDemoMode && !!record.api_id && ['code', 'item_type'].includes(f.key)) }));
  return <><div className="sv-record-title"><div><span className="sv-eyebrow">{t(collections.find(item => item.key === collection)?.label || '')}</span><h2>{recordLabel(collection, record, bundle)}</h2></div><span className="sv-mono">{recordIdentity(collection, record)}</span></div>
    <div className="sv-field-grid sv-form">{definitions.filter(definition => definition.type !== 'json' && !['content_version_id', 'created_at', 'updated_at'].includes(definition.key)).map(definition => {
      const value = Object.hasOwn(record, definition.key) ? record[definition.key] : definition.defaultValue ?? null;
      const disabled = !editable || definition.readOnly;
      if (definition.type === 'number') return <NumericControl key={definition.key + ':' + formRevision} label={t(definition.label)} serverError={serverErrors[definition.key]} value={typeof value === 'number' ? value : null} disabled={disabled} nullable={definition.nullable}
        min={definition.min} max={definition.max} step={definition.step} sliderMin={definition.sliderMin} sliderMax={definition.sliderMax} unit={definition.unit}
        onChange={value => field(definition.key, value)} onError={message => report(definition.label, message)} />;
      if (definition.type === 'string-array') return <StringArrayField key={definition.key + ':' + formRevision} field={definition} value={value} disabled={!!disabled} onChange={value => field(definition.key, value)} />;
      if (definition.type === 'enum' || definition.type === 'boolean' || definition.type === 'reference') {
        const options = definition.type === 'reference' ? referenceOptions(definition, bundle) : definition.type === 'boolean' ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] : (definition.options ?? []).map(value => ({ value, label: value.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase()) }));
        const selected = value === null ? '' : String(value);
        return <label key={definition.key}>{t(definition.label)}<select aria-invalid={!!serverErrors[definition.key]} disabled={disabled} value={selected} onChange={event => field(definition.key, definition.type === 'boolean' ? event.target.value === 'true' : event.target.value || null)}>
          {definition.type !== 'boolean' && <option value="">{definition.nullable ? t('None') : t('Choose') + ' ' + t(definition.label)}</option>}
          {selected && !options.some(option => option.value === selected) && <option value={selected}>{selected} {t("· missing reference")}</option>}
          {options.map(option => <option key={option.value} value={option.value}>{definition.type === 'reference' ? option.label : t(option.label)}{definition.type === 'reference' ? ` (${option.value})` : ''}</option>)}
        </select><small role="alert">{serverErrors[definition.key]}</small></label>;
      }
      return <label key={definition.key}>{t(definition.label)}<input aria-invalid={!!serverErrors[definition.key]} type="text" value={String(value ?? '')} disabled={disabled} required={definition.required} pattern={definition.pattern} maxLength={definition.maxLength} onChange={event => field(definition.key, definition.nullable && !event.target.value ? null : event.target.value)} /><small role="alert">{serverErrors[definition.key]}</small></label>;
    })}</div>
    <details className="sv-json-editor"><summary>{t("Advanced JSON")} {definitions.some(field => field.type === 'json') ? ' · ' + definitions.filter(field => field.type === 'json').map(field => t(field.label)).join(', ') : ''}</summary><textarea aria-label={t("Record JSON")} spellCheck={false} disabled={!editable} value={raw} onChange={event => {
      const value = event.target.value; setRaw(value);
      try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Record must be a JSON object.');
        if (!isDemoMode && (parsed as ContentRecord).api_id !== record.api_id) throw new Error('API resource ID is read-only.');
        for (const definition of definitions.filter(field => field.readOnly)) if (JSON.stringify((parsed as ContentRecord)[definition.key]) !== JSON.stringify(record[definition.key])) throw new Error(definition.label + ' is read-only.');
        fieldErrors.current = {}; setFormRevision(revision => revision + 1); onError(''); onChange(parsed as ContentRecord);
      } catch (error) { report('JSON', error instanceof Error ? error.message : 'Invalid JSON.'); }
    }} /></details></>;
}

export function ContentPage() {
  const t = useTranslation();
  const { state, execute, busy, reload } = useWorkspace(), { user } = useAuth(), toast = useToast();
  const { draftId } = useParams(), navigate = useNavigate();
  const [newLabel, setNewLabel] = useState(''), [creating, setCreating] = useState(false);
  const drafts = state.drafts.filter(draft => draft.authorId === user?.id);
  const selected = draftId ? drafts.find(draft => draft.id === draftId) : drafts.find(draft => ['draft', 'rejected'].includes(draft.status)) || drafts[0];
  async function create(event: React.FormEvent) {
    event.preventDefault();
    try {
      const next = await execute({ type: 'createDraft', title: newLabel, label: newLabel });
      setCreating(false); setNewLabel(''); navigate('/admin/content/' + next.drafts[0].id);
    } catch { /* Workspace displays the error. */ }
  }
  return <div className="sv-page"><PageHeading eyebrow={t("CONTENT VERSIONS")} title={t("Content authoring")} description={t("Edit game balancing and content tables.")} action={<button className="sv-button sv-button-primary" onClick={() => setCreating(!creating)}><Icon name="add" />{t("Create content version")}</button>} />
    {creating && <form className="sv-inline-form sv-panel sv-form" onSubmit={create}><label>{t("Version label")}<input required autoFocus value={newLabel} onChange={event => setNewLabel(event.target.value)} placeholder={t("e.g. Map 02 balance pass")} /></label><button className="sv-button sv-button-primary" disabled={busy || !newLabel.trim()}>{t("Clone published version")}</button><button className="sv-button" type="button" onClick={() => setCreating(false)}>{t("Cancel")}</button></form>}
    {!isDemoMode && selected && selected.status === 'draft' && <div className="sv-row-actions"><button className="sv-button sv-button-danger" disabled={busy} onClick={async () => { if (!window.confirm('Delete version #' + selected.version_no + '?')) return; try { await contentApi.deleteVersion(selected.id, selected.revision); await reload(); navigate('/admin/content'); } catch (error) { toast.error(errorMessage(error)); } }}>{t("Delete version")}</button></div>}
    <div className="sv-draft-picker">{drafts.map(draft => <Link key={draft.id} to={'/admin/content/' + draft.id} className={selected?.id === draft.id ? 'is-active' : ''}><span>#{draft.version_no} · {draft.label || draft.title}</span><Status value={draft.status} /></Link>)}</div>
    {selected ? isDemoMode ? <DraftEditor key={selected.id + ':' + selected.revision} draft={selected} /> : <ApiDraftEditor key={selected.id + ':' + selected.revision + ':' + selected.status + ':' + selected.updatedAt} id={selected.id} /> : <Empty title={draftId ? t("Content version not found") : t("Create your first content version")} description={t("Clone the published version to begin editing.")} />}
  </div>;
}
function ApiDraftEditor({ id }: { id: string }) {
  const t = useTranslation();
  const [loaded, setLoaded] = useState<{ draft: Draft; enums: EnumsDto } | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; Promise.all([contentApi.editor(id), contentApi.enums()]).then(([draft, enums]) => { if (active) { setLoaded({ draft, enums }); setError(''); } }).catch(e => { if (active) setError(errorMessage(e)); }); return () => { active = false; }; }, [id, retry]);
  return error ? <div className="sv-alert sv-alert-error">{error}<button className="sv-button" onClick={() => setRetry(retry + 1)}>{t("Retry")}</button></div> : loaded ? <DraftEditor draft={loaded.draft} enums={loaded.enums} /> : <div className="sv-empty" role="status">{t("Loading content…")}</div>;
}
