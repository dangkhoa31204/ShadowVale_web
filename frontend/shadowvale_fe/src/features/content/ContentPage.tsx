import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from './workspaceContext';
import { collections, type CollectionKey, type ContentBundle, type ContentRecord, type Draft, type JsonValue } from './types';
import { collectionIdentity, createContentRecord, recordIdentity, recordLabel, schemaFields, type FieldDefinition } from './schemaFields';
import { validateBundle } from './workspaceService';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { useConfirm } from '../shared/confirmContext';
import { NumericControl } from '../shared/NumericControl';
import { isDemoMode } from '../../config/environment';
import { apiFields, validateEditor } from './apiModel';
import { contentApi } from './contentApi';
import { errorMessage } from '../../services/api/errors';
import { editorFieldErrors } from './apiFieldErrors';
import type { EnumsDto } from '../../services/api/contracts';
import { isExistingRecord, recordEditorFields, assertReadOnlyFields } from './recordFieldPolicy';

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
  const { user } = useAuth(), { busy, execute, reload } = useWorkspace(), confirm = useConfirm();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<ContentBundle>(() => structuredClone(draft.bundle));
  const [label, setLabel] = useState(draft.label || draft.title), [changelog, setChangelog] = useState(draft.changelog || '');
  const [category, setCategory] = useState<CollectionKey>('weapons'), [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false), [parseError, setParseError] = useState(''), [search, setSearch] = useState('');
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || !!parseError) && currentLocation.pathname !== nextLocation.pathname);
  const [apiError, setApiError] = useState('');
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const validate = useMutation({
    mutationFn: () => contentApi.validate(draft.id, draft.revision),
    onSuccess: async report => {
      if (report.isValid) toast.success('Validation passed.');
      setApiError(report.isValid ? 'Validation passed.' : report.errors.map(i => i.path + ': ' + i.message).join('\n'));
      await reload();
    },
    onError: e => setApiError(errorMessage(e)),
  });
  const errors = [...(!label.trim() ? ['Enter a version label.'] : []), ...(isDemoMode ? validateBundle(bundle) : validateEditor(bundle))];
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
    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={open => { if (!open) blocker.reset?.(); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave unsaved changes?</AlertDialogTitle><AlertDialogDescription>Save this version or discard your changes.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>Discard &amp; leave</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    <div className="sv-editor-toolbar"><div><Status value={draft.status} /><span className="sv-mono">Revision {draft.revision}</span>{dirty && <span className="sv-unsaved">Unsaved changes</span>}</div><div>
      {!isDemoMode && draft.status === 'rejected' && owner && <Button variant="outline" disabled={busy} onClick={()=>void execute({type:'createDraft',title:label+' revision',label:label+' revision',sourceReleaseId:draft.id}).then(workspace=>navigate('/admin/content/'+workspace.drafts[0].id)).catch(()=>{})}>Clone returned version</Button>}
      {isDemoMode && draft.status === 'rejected' && owner && <Button disabled={busy} onClick={() => { void execute({ type: 'editRejectedDraft', id: draft.id, revision: draft.revision }).catch(() => {}); }}><Icon name="edit" />Resume draft</Button>}
      {editable && <>{!isDemoMode && <Button variant="outline" disabled={busy || validate.isPending || dirty || !!parseError || draft.status === 'rejected'} onClick={() => validate.mutate()}>{validate.isPending && <Spinner />}Validate saved content</Button>}<Button variant="outline" disabled={busy || !dirty || !!parseError || !label.trim()} onClick={() => save()}><Icon name="save" />Save draft</Button><Button disabled={busy || (!isDemoMode && draft.status === 'rejected' && !dirty)} aria-describedby={showValidation && submitErrors.length ? 'content-submit-errors' : undefined} onClick={() => save(true)}><Icon name="send" />Submit for review</Button></>}
    </div></div>
    <div className="grid gap-3 px-5 pt-4 empty:hidden">
      {apiError && (apiError === 'Validation passed.' ? <Alert role="status"><AlertDescription className="text-success">{apiError}</AlertDescription></Alert> : <Alert variant="destructive"><AlertDescription className="whitespace-pre-wrap">{apiError}</AlertDescription></Alert>)}
      {!isDemoMode && draft.status === 'rejected' && <Alert><AlertDescription>Change a content record and save to return to Draft, or clone this version.</AlertDescription></Alert>}
      {editable && showValidation && submitErrors.length > 0 && <Alert ref={validationRef} id="content-submit-errors" variant="destructive" tabIndex={-1}><AlertTitle>Check this content before sending</AlertTitle><AlertDescription><ul className="list-disc pl-5">{submitErrors.map((error, index) => <li key={index}>{error}</li>)}</ul></AlertDescription></Alert>}
      {!!draft.validation_errors?.length && <Alert variant="destructive"><AlertTitle>BE validation</AlertTitle><AlertDescription>{draft.validation_errors.map((message,i)=><p key={i}>{message}</p>)}</AlertDescription></Alert>}
      {draft.note && <Alert><AlertTitle>Review note</AlertTitle><AlertDescription>{draft.note}</AlertDescription></Alert>}
      {!editable && <Alert><AlertDescription>{draft.status === 'rejected' && owner ? "Resume this draft to make the requested changes." : "This content version is read-only."}</AlertDescription></Alert>}
    </div>
    <div className="sv-editor-meta sv-form">
      <label>Version label<Input maxLength={200} aria-invalid={!!serverFields['meta:label']} value={label} disabled={!editable} onChange={event => { setLabel(event.target.value); setBundle({ ...bundle, label: event.target.value }); setDirty(true); }} /><small role="alert">{serverFields['meta:label']}</small></label>
      <div className="sv-version-number"><small>Version number</small><strong>#{draft.version_no}</strong></div><div><small>Schema version</small><strong>{bundle.schema_version}</strong></div>
      <label className="sv-changelog">Changelog<Textarea rows={2} maxLength={4000} aria-invalid={!!serverFields['meta:changelog']} value={changelog} disabled={!editable} placeholder="What changed in this version?" onChange={event => { setChangelog(event.target.value); setBundle({ ...bundle, changelog: event.target.value }); setDirty(true); }} /><small role="alert">{serverFields['meta:changelog']}</small></label>
    </div>
    <Tabs value={category} onValueChange={value => chooseCategory(value as CollectionKey)} className="overflow-x-auto border-b px-3 [scrollbar-width:thin]">
      <TabsList variant="line" aria-label="Content table" className="h-12">{collections.map(collection => <TabsTrigger key={collection.key} value={collection.key} className="flex-none px-2.5"><Icon name={collection.icon} />{collection.label}<span className="text-xs text-muted-foreground">{bundle[collection.key].length}</span></TabsTrigger>)}</TabsList>
    </Tabs>
    <div className="sv-content-columns"><aside className="sv-records"><div className="sv-records-heading"><strong>{categoryInfo.label}</strong>{editable && <Button variant="outline" size="icon-sm" title="New record" aria-label="New record" onClick={() => addRecord()} disabled={!!parseError}><Icon name="add" /></Button>}</div>
      <div className="relative mb-4"><Icon name="search" className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search content" className="pl-8" placeholder="Search records…" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div>{bundle[category].map((row, i) => ({ row, i })).filter(({ row }) => `${recordLabel(category, row, bundle)} ${recordIdentity(category, row)}`.toLowerCase().includes(search.toLowerCase())).map(({ row, i }) => <button key={i} className={'sv-record ' + (i === selected ? 'is-active' : '')} onClick={() => { if (!parseError) setSelected(i); }}><span><strong>{recordLabel(category, row, bundle)}</strong><small>{recordIdentity(category, row)}</small></span><Icon name="chevron_right" /></button>)}</div>
    </aside><div className="sv-record-detail">{record ? <RecordEditor key={category + ':' + selected} collection={category} bundle={bundle} record={record} existing={isExistingRecord(category, record, draft.bundle[category])} editable={editable} enums={enums} serverErrors={Object.fromEntries(Object.entries(serverFields).filter(([key]) => key.startsWith(category + ':' + selected + ':')).map(([key, message]) => [key.split(':').at(-1)!, message]))} onChange={updateRecord} onError={setParseError} /> : <Empty title="No records" description={`Add a record to this version: ${categoryInfo.label.toLowerCase()}.`} />}
      {editable && <div className="sv-record-actions">{record ? <><Button variant="outline" disabled={!!parseError} onClick={() => addRecord(true)}><Icon name="content_copy" />Duplicate record</Button><Button variant="destructive" disabled={!!parseError} onClick={async () => {
        if (!await confirm({ title: 'Remove this record?', description: 'Related references must be updated before submitting.', action: 'Remove record', destructive: true })) return;
        setBundle(prev => ({ ...prev, [category]: prev[category].filter((_, i) => i !== selected) })); setSelected(0); setDirty(true);
      }}><Icon name="delete" />Remove record</Button></> : <Button onClick={() => addRecord()}><Icon name="add" />Add record</Button>}</div>}
    </div></div>
    <div className={'sv-validation ' + (errors.length || parseError ? 'has-errors' : '')}><Icon name={errors.length || parseError ? 'error' : 'verified'} /><div><strong>{errors.length || parseError ? "Check content before submitting" : "Content is ready for review"}</strong>{(errors.length > 0 || parseError) && <ul>{[...(parseError ? [parseError] : []), ...errors].slice(0, 12).map((error, i) => <li key={i}>{error}</li>)}</ul>}</div></div>
  </div>;
}

function StringArrayField({ field, value, disabled, onChange }: { field: FieldDefinition; value: JsonValue; disabled: boolean; onChange: (value: JsonValue) => void }) {
  const current = Array.isArray(value) ? value.join(', ') : '';
  const [edit, setEdit] = useState({ current, text: current });
  if (edit.current !== current) setEdit({ current, text: current });
  return <label>{field.label}<Input value={edit.text} disabled={disabled} placeholder="Separate codes with commas" onChange={event => {
    const text = event.target.value, values = text.split(',').map(item => item.trim()).filter(Boolean);
    setEdit({ current: values.join(', '), text }); onChange(values);
  }} /><small className="sv-field-help">Comma-separated values</small></label>;
}

function RecordEditor({ collection, bundle, record, existing, editable, enums, serverErrors, onChange, onError }: { collection: CollectionKey; bundle: ContentBundle; record: ContentRecord; existing: boolean; editable: boolean; enums?: EnumsDto; serverErrors: Record<string, string>; onChange: (row: ContentRecord) => void; onError: (message: string) => void }) {
  const [raw, setRaw] = useState(() => JSON.stringify(record, null, 2));
  const [formRevision, setFormRevision] = useState(0);
  const fieldErrors = useRef<Record<string, string>>({});
  function report(key: string, message: string) {
    fieldErrors.current[key] = message;
    onError(Object.entries(fieldErrors.current).filter(([, message]) => message).map(([key, message]) => key + ': ' + message).join(' '));
  }
  function field(key: string, value: JsonValue) {
    if (!editable || definitions.find(field => field.key === key)?.readOnly) return;
    const next = { ...record, [key]: value }; setRaw(JSON.stringify(next, null, 2)); report('JSON', ''); report(key, ''); onChange(next);
  }
  const definitions = recordEditorFields(collection, isDemoMode ? schemaFields[collection] : apiFields(collection, enums), existing);
  return <><div className="sv-record-title"><div><span className="sv-eyebrow">{(collections.find(item => item.key === collection)?.label || '')}</span><h2>{recordLabel(collection, record, bundle)}</h2></div><span className="sv-mono">{recordIdentity(collection, record)}</span></div>
    {editable && existing && <p className="sv-key-lock-note sv-field-help"><Icon name="lock" />Key fields are locked for existing records.</p>}
    <div className="sv-field-grid sv-form">{definitions.filter(definition => definition.type !== 'json' && !['content_version_id', 'created_at', 'updated_at'].includes(definition.key)).map(definition => {
      const value = Object.hasOwn(record, definition.key) ? record[definition.key] : definition.defaultValue ?? null;
      const disabled = !editable || definition.readOnly;
      if (definition.type === 'number') return <NumericControl key={definition.key + ':' + formRevision} label={definition.label} serverError={serverErrors[definition.key]} value={typeof value === 'number' ? value : null} disabled={disabled} nullable={definition.nullable}
        min={definition.min} max={definition.max} step={definition.step} sliderMin={definition.sliderMin} sliderMax={definition.sliderMax} unit={definition.unit}
        onChange={value => field(definition.key, value)} onError={message => report(definition.label, message)} />;
      if (definition.type === 'string-array') return <StringArrayField key={definition.key + ':' + formRevision} field={definition} value={value} disabled={!!disabled} onChange={value => field(definition.key, value)} />;
      if (definition.type === 'enum' || definition.type === 'boolean' || definition.type === 'reference') {
        const options = definition.type === 'reference' ? referenceOptions(definition, bundle) : definition.type === 'boolean' ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] : (definition.options ?? []).map(value => ({ value, label: value.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase()) }));
        const selected = value === null ? '' : String(value);
        return <label key={definition.key}>{definition.label}<NativeSelect className="w-full" data-testid={'field-'+collection+'-'+definition.key} aria-invalid={!!serverErrors[definition.key]} disabled={disabled} value={selected} onChange={event => field(definition.key, definition.type === 'boolean' ? event.target.value === 'true' : event.target.value || null)}>
          {definition.type !== 'boolean' && <NativeSelectOption value="">{definition.nullable ? 'None' : 'Choose ' + definition.label}</NativeSelectOption>}
          {selected && !options.some(option => option.value === selected) && <NativeSelectOption value={selected}>{selected} · missing reference</NativeSelectOption>}
          {options.map(option => <NativeSelectOption key={option.value} value={option.value}>{option.label}{definition.type === 'reference' ? ` (${option.value})` : ''}</NativeSelectOption>)}
        </NativeSelect><small role="alert">{serverErrors[definition.key]}</small></label>;
      }
      return <label key={definition.key}>{definition.label}<Input aria-invalid={!!serverErrors[definition.key]} type="text" value={String(value ?? '')} disabled={disabled} required={definition.required} pattern={definition.pattern} maxLength={definition.maxLength} onChange={event => field(definition.key, definition.nullable && !event.target.value ? null : event.target.value)} /><small role="alert">{serverErrors[definition.key]}</small></label>;
    })}</div>
    <details className="sv-json-editor"><summary>Advanced JSON {definitions.some(field => field.type === 'json') ? ' · ' + definitions.filter(field => field.type === 'json').map(field => field.label).join(', ') : ''}</summary><Textarea className="min-h-72 rounded-none border-0 border-t font-mono text-xs" aria-label="Record JSON" spellCheck={false} disabled={!editable} value={raw} onChange={event => {
      const value = event.target.value; setRaw(value);
      try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Record must be a JSON object.');
        assertReadOnlyFields(definitions, record, parsed as ContentRecord);
        fieldErrors.current = {}; setFormRevision(revision => revision + 1); onError(''); onChange(parsed as ContentRecord);
      } catch (error) { report('JSON', error instanceof Error ? error.message : 'Invalid JSON.'); }
    }} /></details></>;
}

export function ContentPage() {
  const { state, execute, busy } = useWorkspace(), { user } = useAuth();
  const { draftId } = useParams(), navigate = useNavigate();
  const [newLabel, setNewLabel] = useState(''), [creating, setCreating] = useState(false);
  const drafts = state.drafts.filter(draft => draft.authorId === user?.id && draft.status !== 'archived');
  const selected = draftId ? drafts.find(draft => draft.id === draftId) : drafts.find(draft => ['draft', 'rejected'].includes(draft.status)) || drafts[0];
  async function create(event: React.FormEvent) {
    event.preventDefault();
    try {
      const next = await execute({ type: 'createDraft', title: newLabel, label: newLabel });
      setCreating(false); setNewLabel(''); navigate('/admin/content/' + next.drafts[0].id);
    } catch { /* Workspace displays the error. */ }
  }
  if (draftId && state.drafts.some(draft => draft.id === draftId && draft.authorId === user?.id && draft.status === 'archived')) {
    return <Navigate to="/admin/content" replace />;
  }
  return <div className="sv-page"><PageHeading title="Content authoring" description="Edit game balancing and content tables." action={<Button onClick={() => setCreating(!creating)}><Icon name="add" />Create content version</Button>} />
    {creating && <form className="sv-panel flex flex-wrap items-end gap-3 p-5" onSubmit={create}><Field className="min-w-60 flex-1"><FieldLabel htmlFor="new-version-label">Version label</FieldLabel><Input id="new-version-label" required autoFocus value={newLabel} onChange={event => setNewLabel(event.target.value)} placeholder="e.g. Map 02 balance pass" /></Field><Button disabled={busy || !newLabel.trim()}>Clone published version</Button><Button variant="outline" type="button" onClick={() => setCreating(false)}>Cancel</Button></form>}
    <div className="sv-draft-picker">{drafts.map(draft => <Link key={draft.id} to={'/admin/content/' + draft.id} className={selected?.id === draft.id ? 'is-active' : ''}><span>#{draft.version_no} · {draft.label || draft.title}</span><Status value={draft.status} /></Link>)}</div>
    {selected ? isDemoMode ? <DraftEditor key={selected.id + ':' + selected.revision} draft={selected} /> : <ApiDraftEditor key={selected.id + ':' + selected.revision + ':' + selected.status + ':' + selected.updatedAt} id={selected.id} version={selected.revision + ':' + selected.status + ':' + selected.updatedAt} /> : <Empty title={draftId ? "Content version not found" : "Create your first content version"} description="Clone the published version to begin editing." />}
  </div>;
}
function ApiDraftEditor({ id, version }: { id: string; version: string }) {
  // One load per server version: the editor keeps its own edits, so this data must not refresh underneath it.
  const editor = useQuery({ queryKey: ['content-editor', id, version], queryFn: () => contentApi.editor(id), staleTime: Infinity, gcTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const enums = useQuery({ queryKey: ['enums'], queryFn: contentApi.enums, staleTime: Infinity });
  const error = editor.error || enums.error;
  if (error) return <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-4">{errorMessage(error)}<Button variant="outline" size="sm" onClick={() => { void editor.refetch(); void enums.refetch(); }}>Retry</Button></AlertDescription></Alert>;
  if (!editor.data || !enums.data) return <div className="sv-empty flex items-center justify-center gap-2" role="status"><Spinner />Loading content…</div>;
  return <DraftEditor draft={editor.data} enums={enums.data} />;
}
