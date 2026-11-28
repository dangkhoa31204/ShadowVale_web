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
import { contentNavigation, designerFields, updateDraftMapLayout } from './designerPresentation';
import { isDemoMode } from '../../config/environment';
import { apiFields, validateEditor } from './apiModel';
import { contentApi, isUnityImport, missingUnityContent, UnityImportError } from './contentApi';
import { errorMessage } from '../../services/api/errors';
import { editorFieldErrors } from './apiFieldErrors';
import type { EnumsDto } from '../../services/api/contracts';
import { isExistingRecord, recordEditorFields } from './recordFieldPolicy';
import { ItemStatsEditor, SkillLevelsEditor } from './StructuredContentEditors';
import { skillColumns, structuredContentErrors } from './structuredContent';
import { GameRulesEditor } from './GameRulesEditor';
import { gameCatalogApi, type GameCatalog } from './gameCatalogApi';
import { QuestObjectives, RelatedRows } from './RelatedContentEditor';
import { EnemyDetails, MapTwoEnemyReference, ScriptedWeapons } from './UnityContentReference';
import { detailLabel, enemyReadOnly, relatedSection, replaceRelatedRows, setKnifeAttackInterval } from './recordDetails';
import { MapDifficultyEditor } from './MapDifficultyEditor';
import { bundledLayoutPresets, jsonObject } from './mapDifficulty';

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
  const [editingRules, setEditingRules] = useState(false), [tradeMapCode, setTradeMapCode] = useState('map01');
  const [dirty, setDirty] = useState(false), [parseError, setParseError] = useState(''), [search, setSearch] = useState('');
  const deletingDraft = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !deletingDraft.current && (dirty || !!parseError) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  const [apiError, setApiError] = useState('');
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const validate = useMutation({
    mutationFn: () => contentApi.validate(draft.id, draft.revision),
    onSuccess: async report => {
      if (report.isValid) toast.success('Validation passed.');
      const codes = bundle.maps.map(row => String(row.code)).sort();
      setServerFields(Object.fromEntries(report.errors.flatMap(issue => {
        const path = issue.path.match(/^\/maps\/(\d+)\/layout\/game_rules\/difficulty\/levels\/(\w+)\/(\w+)$/);
        if (!path) return [];
        const mapIndex = bundle.maps.findIndex(row => row.code === codes[Number(path[1])]);
        return mapIndex >= 0 ? [['maps:' + mapIndex + ':' + path[2] + '.' + path[3], issue.message]] : [];
      })));
      setApiError(report.isValid ? 'Validation passed.' : report.errors.map(i => i.path + ': ' + i.message).join('\n'));
      await reload();
    },
    onError: e => setApiError(errorMessage(e)),
  });
  const structuredErrors = structuredContentErrors(bundle, draft.bundle);
  const errors = [...(!label.trim() ? ['Enter a version label.'] : []), ...(isDemoMode ? validateBundle(bundle) : validateEditor(bundle)), ...structuredErrors];
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
  const record = bundle[category][selected];
  const savedRecord = record && draft.bundle[category].find(row => recordIdentity(category, row) === recordIdentity(category, record));
  const categoryInfo = collections.find(collection => collection.key === category)!;
  const categoryGroup = contentNavigation.find(group => group.records.some(record => record.key === category))!;
  const catalog = useQuery({ queryKey: ['game-catalog'], queryFn: ({ signal }) => gameCatalogApi.get(signal), staleTime: 60_000, enabled: !isDemoMode });
  const unitySource = catalog.data;
  const importMissing = draft.status === 'draft' && owner && !draft.submitted_at && unitySource?.authoringBundle &&
    isUnityImport(draft.changelog, unitySource.sourceHash) ? missingUnityContent(unitySource.authoringBundle, draft.bundle) : [];
  const completeImport = useMutation({
    mutationFn: async () => {
      if (!unitySource?.authoringBundle) throw new Error('Unity source content is unavailable.');
      await contentApi.importUnity(unitySource.authoringBundle, unitySource.sourceHash, draft.id);
      await reload();
    },
  });
  const editable = (draft.status === 'draft' || (!isDemoMode && draft.status === 'rejected')) && owner && !completeImport.isPending;
  const related = relatedSection(category);
  const visibleTabs = categoryGroup.records;
  const settingsTab = categoryGroup.rules;
  const sharedRulesMap = bundle.maps.find(map => map.code === 'map01');
  const stockMaps = bundle.maps.filter(map => map.code === 'map01' || map.code === 'map02');
  const stockMap = stockMaps.find(map => map.code === tradeMapCode) ?? stockMaps[0];
  const savedSharedLayout = draft.bundle.maps.find(map => map.code === 'map01')?.layout;
  const savedStockLayout = draft.bundle.maps.find(map => map.code === stockMap?.code)?.layout;
  useEffect(() => {
    if (!dirty && !parseError) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, parseError]);
  function chooseCategory(key: CollectionKey) {
    if (parseError) { toast.error('Resolve the field error before switching content.'); return; }
    setEditingRules(false); setCategory(key); setSelected(0); setSearch('');
  }
  function selectContentTab(value: string) {
    if (value !== 'rules') { chooseCategory(value as CollectionKey); return; }
    if (parseError) { toast.error('Resolve the field error before switching content.'); return; }
    setEditingRules(true);
  }
  function changeRuleLayout(mapCode: string, layout: JsonValue) {
    setBundle(current => updateDraftMapLayout(current, mapCode, layout));
    setDirty(true);
  }
  function updateRecord(value: ContentRecord) {
    if (related && record?.code !== value.code && bundle[category].some((row, index) => index !== selected && row.code === value.code)) {
      toast.error('Mã này đã được sử dụng.');
      return;
    }
    setBundle(prev => {
      const next = { ...prev, [category]: prev[category].map((row, i) => i === selected ? value : row) };
      if (!related || !record || record.code === value.code) return next;
      const rows = prev[related.collection].filter(row => row[related.parentKey] === record.code).map(row => ({ ...row, [related.parentKey]: value.code }));
      return replaceRelatedRows(next, related, record.code, rows);
    });
    setDirty(true);
  }
  function updateRelated(rows: ContentRecord[]) {
    if (!related || !record) return;
    setBundle(current => replaceRelatedRows(current, related, record.code, rows));
    setDirty(true);
  }
  function updateKnifeCooldown(seconds: number) {
    setBundle(current => setKnifeAttackInterval(current, seconds));
    setDirty(true);
  }
  const importedKnife = catalog.data?.authoringBundle?.weapons.find(weapon => weapon.item_code === 'knife');
  const importedKnifeItem = catalog.data?.authoringBundle?.items.find(item => item.code === 'knife');
  const existingKnifeItem = bundle.items.find(item => item.code === 'knife');
  function addKnife() {
    if (!importedKnife || !importedKnifeItem || bundle.weapons.some(weapon => weapon.item_code === 'knife')) return;
    setBundle(current => ({
      ...current,
      items: existingKnifeItem
        ? current.items.map(item => item.code === 'knife' ? { ...item, stats: { ...jsonObject(importedKnifeItem.stats), ...jsonObject(item.stats) } } : item)
        : [...current.items, importedKnifeItem],
      weapons: [...current.weapons, importedKnife],
    }));
    setSelected(bundle.weapons.length); setSearch(''); setDirty(true);
  }
  function addRecord(duplicate = false) {
    try {
      const added = newRecord(category, bundle, duplicate ? record : undefined);
      setBundle(prev => {
        const next = { ...prev, [category]: [...prev[category], added] };
        if (!duplicate || !related || !record) return next;
        const rows = prev[related.collection].filter(row => row[related.parentKey] === record.code).map(row => ({ ...row, [related.parentKey]: added.code }));
        return replaceRelatedRows(next, related, added.code, rows);
      });
      setSelected(bundle[category].length); setSearch(''); setDirty(true);
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
    if ((!isDemoMode && errors.length) || structuredErrors.length) { setApiError(errors.join('\n')); return; }
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
  async function deleteDraft() {
    const discard = dirty || !!parseError;
    const approved = await confirm({
      title: 'Delete this draft?',
      description: 'Draft #' + draft.version_no + ' will be removed from Content authoring.' + (discard ? ' Unsaved edits will be discarded.' : ''),
      action: 'Delete draft',
      destructive: true,
    });
    if (!approved) return;

    deletingDraft.current = true;
    setApiError('');
    try {
      await execute({ type: 'deleteDraft', id: draft.id, revision: draft.revision });
      navigate('/admin/content', { replace: true });
    } catch (error) {
      deletingDraft.current = false;
      setApiError(errorMessage(error));
    }
  }
  return <div className="sv-editor">
    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={open => { if (!open) blocker.reset?.(); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave unsaved changes?</AlertDialogTitle><AlertDialogDescription>Save this version or discard your changes.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>Discard &amp; leave</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    <div className="sv-editor-toolbar"><div><Status value={draft.status} /><span className="sv-mono">Revision {draft.revision}</span>{dirty && <span className="sv-unsaved">Unsaved changes</span>}</div><div>
      {owner && draft.status === 'draft' && <Button variant="outline" className="text-destructive" disabled={busy || validate.isPending || completeImport.isPending} onClick={() => void deleteDraft()}><Icon name="delete" />Delete draft</Button>}
      {!isDemoMode && draft.status === 'rejected' && owner && <Button variant="outline" disabled={busy} onClick={()=>void execute({type:'createDraft',title:label+' revision',label:label+' revision',sourceReleaseId:draft.id}).then(workspace=>navigate('/admin/content/'+workspace.drafts[0].id)).catch(()=>{})}>Clone returned version</Button>}
      {isDemoMode && draft.status === 'rejected' && owner && <Button disabled={busy} onClick={() => { void execute({ type: 'editRejectedDraft', id: draft.id, revision: draft.revision }).catch(() => {}); }}><Icon name="edit" />Resume draft</Button>}
      {editable && <>{!isDemoMode && <Button variant="outline" disabled={busy || validate.isPending || dirty || !!parseError || draft.status === 'rejected'} onClick={() => validate.mutate()}>{validate.isPending && <Spinner />}Validate saved content</Button>}<Button variant="outline" disabled={busy || !dirty || !!parseError || !label.trim()} onClick={() => save()}><Icon name="save" />Save draft</Button><Button disabled={busy || (!isDemoMode && draft.status === 'rejected' && !dirty)} aria-describedby={showValidation && submitErrors.length ? 'content-submit-errors' : undefined} onClick={() => save(true)}><Icon name="send" />Submit for review</Button></>}
    </div></div>
    <div className="grid gap-3 px-5 pt-4 empty:hidden">
      {apiError && (apiError === 'Validation passed.' ? <Alert role="status"><AlertDescription className="text-success">{apiError}</AlertDescription></Alert> : <Alert variant="destructive"><AlertDescription className="whitespace-pre-wrap">{apiError}</AlertDescription></Alert>)}
      {importMissing.length > 0 && <Alert>
        <AlertTitle>Unity import is incomplete</AlertTitle>
        <AlertDescription>
          <p>{importMissing.length} missing entries · {importMissing.slice(0, 4).join(', ')}{importMissing.length > 4 && '…'}</p>
          <Button variant="outline" size="sm" disabled={busy || dirty || !!parseError || completeImport.isPending} onClick={() => completeImport.mutate()}>
            {completeImport.isPending ? 'Completing Unity import…' : 'Complete Unity import'}
          </Button>
          {dirty && <p>Save your draft edits before completing the import.</p>}
          {completeImport.error && <p role="alert" className="whitespace-pre-wrap text-destructive">{errorMessage(completeImport.error)}</p>}
        </AlertDescription>
      </Alert>}
      {!isDemoMode && draft.status === 'rejected' && <Alert><AlertDescription>Change a content record and save to return to Draft, or clone this version.</AlertDescription></Alert>}
      {editable && showValidation && submitErrors.length > 0 && <Alert ref={validationRef} id="content-submit-errors" variant="destructive" tabIndex={-1}><AlertTitle>Check this content before sending</AlertTitle><AlertDescription><ul className="list-disc pl-5">{submitErrors.map((error, index) => <li key={index}>{error}</li>)}</ul></AlertDescription></Alert>}
      {!!draft.validation_errors?.length && <Alert variant="destructive"><AlertTitle>BE validation</AlertTitle><AlertDescription>{draft.validation_errors.map((message,i)=><p key={i}>{message}</p>)}</AlertDescription></Alert>}
      {draft.note && <Alert><AlertTitle>Review note</AlertTitle><AlertDescription>{draft.note}</AlertDescription></Alert>}
      {!editable && !completeImport.isPending && <Alert><AlertDescription>{draft.status === 'rejected' && owner ? "Resume this draft to make the requested changes." : "This content version is read-only."}</AlertDescription></Alert>}
    </div>
    <div className="sv-editor-meta sv-form">
      <label>Version label<Input maxLength={200} aria-invalid={!!serverFields['meta:label']} value={label} disabled={!editable} onChange={event => { setLabel(event.target.value); setBundle({ ...bundle, label: event.target.value }); setDirty(true); }} /><small role="alert">{serverFields['meta:label']}</small></label>
      <div className="sv-version-number"><small>Version number</small><strong>#{draft.version_no}</strong></div><div><small>Schema version</small><strong>{bundle.schema_version}</strong></div>
      <label className="sv-changelog">Changelog<Textarea rows={2} maxLength={4000} aria-invalid={!!serverFields['meta:changelog']} value={changelog} disabled={!editable} placeholder="What changed in this version?" onChange={event => { setChangelog(event.target.value); setBundle({ ...bundle, changelog: event.target.value }); setDirty(true); }} /><small role="alert">{serverFields['meta:changelog']}</small></label>
    </div>
    <Tabs value={categoryGroup.key} onValueChange={value => chooseCategory(value as CollectionKey)} className="overflow-x-auto border-b px-3 [scrollbar-width:thin]">
      <TabsList variant="line" aria-label="Content groups" className="h-12">{contentNavigation.map(collection =>
        <TabsTrigger key={collection.key} id={'content-group-'+collection.key} data-testid={'content-group-'+collection.key} value={collection.key} onClick={() => { if (categoryGroup.key === collection.key) chooseCategory(collection.key); }} className="flex-none px-2.5"><Icon name={collection.icon} />{collection.label}<span className="text-xs text-muted-foreground">{bundle[collection.key].length}</span></TabsTrigger>
      )}</TabsList>
    </Tabs>
    {(visibleTabs.length > 1 || settingsTab) && <Tabs value={editingRules ? 'rules' : category} onValueChange={selectContentTab} className="overflow-x-auto border-b bg-muted/20 px-3 [scrollbar-width:thin]">
      <TabsList variant="line" aria-label="Content table" className="h-10">{visibleTabs.map(({ key, label, icon }) =>
        <TabsTrigger key={key} id={'content-table-'+key} data-testid={'content-table-'+key} value={key} className="flex-none px-2.5"><Icon name={icon} />{label}<span className="text-xs text-muted-foreground">{bundle[key].length}</span></TabsTrigger>
      )}{settingsTab && <TabsTrigger value="rules" data-testid={'content-rules-' + settingsTab.section} className="flex-none px-2.5">{settingsTab.label}</TabsTrigger>}</TabsList>
    </Tabs>}
    {editingRules && settingsTab ? <div className="space-y-4 p-5">
      <h2 className="font-semibold">{settingsTab.label}</h2>
      {settingsTab.section === 'trade' && stockMap &&
        <label className="block max-w-xs text-sm">Bản đồ bán hàng
          <NativeSelect className="mt-1 w-full" value={String(stockMap.code)} disabled={!!parseError} onChange={event => setTradeMapCode(event.target.value)}>
            {stockMaps.map(map => <NativeSelectOption key={String(map.code)} value={String(map.code)}>{String(map.name || map.code)}</NativeSelectOption>)}
          </NativeSelect>
        </label>}
      {(sharedRulesMap || settingsTab.section === 'trade' && stockMap) ?
        <GameRulesEditor key={settingsTab.section + ':' + (settingsTab.section === 'trade' ? stockMap?.code : 'map01')}
          section={settingsTab.section} hasSharedRules={!!sharedRulesMap} layout={sharedRulesMap?.layout} stockLayout={stockMap?.layout} savedLayout={savedSharedLayout} savedStockLayout={savedStockLayout} bundle={bundle} editable={editable}
          onChange={value => changeRuleLayout('map01', value)} onError={setParseError}
          onStockChange={value => { if (stockMap) changeRuleLayout(String(stockMap.code), value); }} /> :
        <Empty title="Chưa có bản đồ hỗ trợ trong bản nháp" />}
    </div> : <div className="sv-content-columns"><aside className="sv-records"><div className="sv-records-heading"><strong>{categoryInfo.label}</strong>{editable && <Button variant="outline" size="icon-sm" title="New record" aria-label="New record" onClick={() => addRecord()} disabled={!!parseError}><Icon name="add" /></Button>}</div>
      <div className="relative mb-4"><Icon name="search" className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search content" className="pl-8" placeholder="Search records…" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div>{bundle[category].map((row, i) => ({ row, i })).filter(({ row }) => `${recordLabel(category, row, bundle)} ${recordIdentity(category, row)}`.toLowerCase().includes(search.toLowerCase())).map(({ row, i }) => <button key={i} className={'sv-record ' + (i === selected ? 'is-active' : '')} onClick={() => { if (!parseError) setSelected(i); }}><span><strong>{recordLabel(category, row, bundle)}</strong><small>{recordIdentity(category, row)}</small></span><Icon name="chevron_right" /></button>)}</div>
      {category === 'weapons' && <ScriptedWeapons catalog={catalog.data} />}
      {category === 'weapons' && editable && importedKnife && importedKnifeItem && (!existingKnifeItem || existingKnifeItem.item_type === 'weapon') &&
        !bundle.weapons.some(weapon => weapon.item_code === 'knife') &&
        <Button variant="outline" size="sm" className="mt-3" disabled={!!parseError} onClick={addKnife}>Thêm Dao từ Unity</Button>}
    </aside><div className="sv-record-detail">{category === 'enemy_types' && <MapTwoEnemyReference />}{record ? <RecordEditor key={category + ':' + selected} collection={category} bundle={bundle} savedBundle={draft.bundle} catalog={catalog.data} record={record} savedRecord={savedRecord} existing={isExistingRecord(category, record, draft.bundle[category])} editable={editable} enums={enums} serverErrors={Object.fromEntries(Object.entries(serverFields).filter(([key]) => key.startsWith(category + ':' + selected + ':')).map(([key, message]) => [key.split(':').at(-1)!, message]))} onChange={updateRecord} onRelatedChange={updateRelated} onKnifeCooldownChange={updateKnifeCooldown} onError={setParseError} /> : <Empty title="No records" description={`Add a record to this version: ${categoryInfo.label.toLowerCase()}.`} />}
      {editable && <div className="sv-record-actions">{record ? <><Button variant="outline" disabled={!!parseError} onClick={() => addRecord(true)}><Icon name="content_copy" />Duplicate record</Button><Button variant="destructive" disabled={!!parseError} onClick={async () => {
        if (!await confirm({ title: 'Remove this record?', description: 'Related references must be updated before submitting.', action: 'Remove record', destructive: true })) return;
        setBundle(prev => {
          const next = { ...prev, [category]: prev[category].filter((_, i) => i !== selected) };
          return related ? replaceRelatedRows(next, related, record.code, []) : next;
        });
        setSelected(0); setDirty(true);
      }}><Icon name="delete" />Remove record</Button></> : <Button onClick={() => addRecord()}><Icon name="add" />Add record</Button>}</div>}
    </div></div>}
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

function RecordEditor({ collection, bundle, savedBundle, catalog, record, savedRecord, existing, editable, enums, serverErrors, onChange, onRelatedChange, onKnifeCooldownChange, onError }: { collection: CollectionKey; bundle: ContentBundle; savedBundle: ContentBundle; catalog?: GameCatalog; record: ContentRecord; savedRecord?: ContentRecord; existing: boolean; editable: boolean; enums?: EnumsDto; serverErrors: Record<string, string>; onChange: (row: ContentRecord) => void; onRelatedChange: (rows: ContentRecord[]) => void; onKnifeCooldownChange: (seconds: number) => void; onError: (message: string) => void }) {
  const fieldErrors = useRef<Record<string, string>>({});
  function report(key: string, message: string) {
    fieldErrors.current[key] = message;
    onError(Object.entries(fieldErrors.current).filter(([, message]) => message).map(([key, message]) => key + ': ' + message).join(' '));
  }
  function field(key: string, value: JsonValue) {
    if (!editable || definitions.find(field => field.key === key)?.readOnly) return;
    if (key === 'skill_type' || key === 'item_type') fieldErrors.current = {};
    report(key, '');
    onChange({ ...record, [key]: value });
  }
  const definitions = recordEditorFields(collection, isDemoMode ? schemaFields[collection] : apiFields(collection, enums), existing);
  const isKnife = collection === 'weapons' && record.item_code === 'knife' && record.weapon_class === 'melee';
  const isUnitySkill = collection === 'skills' && Object.keys(skillColumns(record.skill_type)).length > 0;
  const visibleDefinitions = designerFields(collection, definitions).filter(field =>
    (!isKnife || ['damage', 'effective_range'].includes(field.key)) && (!isUnitySkill || field.key !== 'max_level'));
  const knifeDefaultInterval = catalog?.weapons.find(weapon => weapon.id === 'knife')?.cooldown_seconds ?? .75;
  function knifeInterval(version: ContentBundle) {
    const value = jsonObject(version.items.find(item => item.code === 'knife')?.stats).melee_cooldown_s;
    return typeof value === 'number' ? value : knifeDefaultInterval;
  }
  const related = relatedSection(collection);
  const structuredEditor = isKnife || related || ['maps', 'map_loot_tables', 'enemy_types', 'enemy_placements'].includes(collection);
  const runtimeLoot = catalog?.lootTables.some(table => table.code === record.code);
  const sourceRecipe = collection === 'crafting_recipes' ? catalog?.recipes.find(recipe => recipe.id === record.code) : undefined;
  const recipeInputs = collection === 'crafting_recipes' ? bundle.crafting_recipe_ingredients.filter(row => row.recipe_code === record.code) : [];
  const itemName = (code: JsonValue) => String(bundle.items.find(item => item.code === code)?.name ?? code ?? 'Chưa chọn');
  const lootSources = collection === 'loot_tables' ? [
    ...bundle.map_loot_tables.filter(row => row.loot_table_code === record.code).map(row => `${bundle.maps.find(map => map.code === row.map_code)?.name ?? row.map_code} · ${row.container_tag}`),
    ...bundle.enemy_types.filter(row => row.loot_table_code === record.code && String(row.code).startsWith('m1_')).map(row => row.name),
  ] : [];
  const mapCode = typeof record.code === 'string' ? record.code : '';
  const graph = jsonObject(record.nav_graph);
  const graphNodeCount = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
  const routePointCount = Array.isArray(record.patrol_route) ? record.patrol_route.length : 0;
  return <><div className="sv-record-title"><div><span className="sv-eyebrow">{(collections.find(item => item.key === collection)?.label || '')}</span><h2>{recordLabel(collection, record, bundle)}</h2></div><span className="sv-mono">{recordIdentity(collection, record)}</span></div>
    {editable && existing && <p className="sv-key-lock-note sv-field-help"><Icon name="lock" />Key fields are locked for existing records.</p>}
    {collection === 'maps' && Object.hasOwn(bundledLayoutPresets, mapCode) &&
      <MapDifficultyEditor key={mapCode} mapCode={mapCode} layout={record.layout} savedLayout={savedRecord?.layout} editable={editable}
        onChange={value => field('layout', value)} onError={report} errors={serverErrors} />}
    {collection === 'maps' && <h3 className="mt-5 font-semibold">Thông tin map</h3>}
    {collection === 'crafting_recipes' && <>
      <div className="my-4 space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">{recipeInputs.map(row => `${row.quantity} × ${itemName(row.item_code)}`).join(' + ') || 'Chưa có nguyên liệu'} <span aria-label="tạo ra">→</span> {String(record.output_quantity ?? '—')} × {itemName(record.output_item_code)}</p>
        {catalog && <p className="text-muted-foreground">{sourceRecipe
          ? [sourceRecipe.benchAvailable ? 'Bàn chế tạo' : null, sourceRecipe.fieldAvailable ? 'Chế tạo dã chiến' : null].filter(Boolean).join(' · ') || 'Chưa có trong menu chế tạo của Unity.'
          : 'Công thức mới cần được gắn vào giao diện chế tạo Unity.'}</p>}
      </div>
      <h3 className="mt-5 font-semibold">Thành phẩm đầu ra &amp; thông tin công thức</h3>
    </>}
    {collection === 'loot_tables' && <div className="my-4 space-y-1 rounded-lg border p-4 text-sm">
      {lootSources.length > 0 ? <p>Sử dụng tại {lootSources.join(' · ')}</p> : <p>{runtimeLoot ? 'Bảng rơi dùng trong Unity.' : 'Chưa thấy gán bảng này cho hòm hoặc túi lính Map 1 trong bản nháp.'}</p>}
      <p className="text-muted-foreground">Map 1 chọn bậc trước, rồi chọn vật phẩm theo trọng số trong bậc. Xác suất cơ sở chưa tính hỗ trợ thiếu đạn hoặc máu. Nhiều lượt có thể trùng vật phẩm. Bậc 5 được nhận một lần ngoài các lượt quay.</p>
    </div>}
    {collection === 'quests' && <p className="my-4 rounded-lg border p-4 text-sm text-muted-foreground">Tên, mô tả và phần thưởng ở đây thuộc bản nội dung trên web. Trình tự, điều kiện và hành vi nhiệm vụ chạy theo Unity. Điểm nhận trong game chỉnh ở tab Mission points.</p>}
    {collection === 'enemy_types' && <EnemyDetails row={record} bundle={bundle} />}
    {isKnife && <p className="my-4 rounded-lg border p-4 text-sm">Cận chiến · Các thông số áp dụng cho đòn đánh thường. Kết liễu lén và các đoạn nhiệm vụ dùng quy tắc của Unity.</p>}
    <div className="sv-field-grid sv-form">{visibleDefinitions.filter(definition => definition.type !== 'json' && !['content_version_id', 'created_at', 'updated_at'].includes(definition.key)).map(definition => {
      const value = Object.hasOwn(record, definition.key) ? record[definition.key] : definition.defaultValue ?? null;
      const disabled = !editable || definition.readOnly || collection === 'maps' && existing && definition.key === 'scene_key' || collection === 'enemy_types' && enemyReadOnly(mapCode, definition.key);
      const label = isKnife ? definition.key === 'damage' ? 'Sát thương mỗi đòn' : 'Tầm đánh' : structuredEditor ? detailLabel(definition) : definition.label;
      const savedValue = savedRecord?.[definition.key];
      if (definition.type === 'number') return <NumericControl key={definition.key} label={label} serverError={serverErrors[definition.key]} value={typeof value === 'number' ? value : null} savedValue={!disabled ? (typeof savedValue === 'number' ? savedValue : null) : undefined} disabled={disabled} nullable={definition.nullable}
        min={definition.min} max={definition.max} step={definition.step} sliderMin={definition.sliderMin} sliderMax={isKnife ? definition.key === 'damage' ? 100 : 5 : definition.sliderMax} unit={isKnife ? definition.key === 'damage' ? 'HP' : 'm' : definition.unit}
        onChange={value => field(definition.key, value)} onError={message => report(definition.label, message)} />;
      if (definition.type === 'string-array') return <StringArrayField key={definition.key} field={definition} value={value} disabled={!!disabled} onChange={value => field(definition.key, value)} />;
      if (definition.type === 'enum' || definition.type === 'boolean' || definition.type === 'reference') {
        let options = definition.type === 'reference' ? referenceOptions(definition, bundle) : definition.type === 'boolean' ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] : (definition.options ?? []).filter(option => collection !== 'items' || definition.key !== 'item_type' || option !== 'armor' || record.item_type === 'armor').map(value => ({ value, label: value.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase()) }));
        if (collection === 'crafting_recipes' && definition.key === 'output_item_code') {
          const inputs = new Set(recipeInputs.map(row => row.item_code));
          options = options.filter(option => option.value === value || !inputs.has(option.value));
        }
        const selected = value === null ? '' : String(value);
        return <label key={definition.key}>{label}<NativeSelect className="w-full" data-testid={'field-'+collection+'-'+definition.key} aria-invalid={!!serverErrors[definition.key]} disabled={disabled} value={selected} onChange={event => field(definition.key, definition.type === 'boolean' ? event.target.value === 'true' : event.target.value || null)}>
          {definition.type !== 'boolean' && <NativeSelectOption value="">{collection === 'enemy_types' && definition.key === 'loot_table_code' ? 'Dùng bảng gốc trong Unity' : definition.nullable ? 'None' : 'Choose ' + definition.label}</NativeSelectOption>}
          {selected && !options.some(option => option.value === selected) && <NativeSelectOption value={selected}>{selected} · missing reference</NativeSelectOption>}
          {options.map(option => <NativeSelectOption key={option.value} value={option.value}>{option.label}{definition.type === 'reference' ? ` (${option.value})` : ''}</NativeSelectOption>)}
        </NativeSelect><small role="alert">{serverErrors[definition.key]}</small></label>;
      }
      return <label key={definition.key}>{label}<Input aria-invalid={!!serverErrors[definition.key]} type="text" value={String(value ?? '')} disabled={disabled} required={definition.required} pattern={definition.pattern} maxLength={definition.maxLength} onChange={event => field(definition.key, definition.nullable && !event.target.value ? null : event.target.value)} /><small role="alert">{serverErrors[definition.key]}</small></label>;
    })}{isKnife && <NumericControl label="Thời gian giữa hai đòn" unit="s" value={knifeInterval(bundle)} savedValue={editable ? savedRecord ? knifeInterval(savedBundle) : null : undefined}
      disabled={!editable} min={.1} max={5} step={.01} sliderMax={2} onError={message => report('Thời gian giữa hai đòn', message)}
      onChange={value => { if (value !== null) onKnifeCooldownChange(value); }} />}</div>
    {collection === 'maps' &&
      <p className="mb-4 text-sm text-muted-foreground">Sơ đồ đường đi · {graphNodeCount} nút · quản lý trong Unity</p>}
    {collection === 'enemy_placements' &&
      <p className="text-sm text-muted-foreground">Tuyến tuần tra · {routePointCount} điểm · {record.spawn_condition ? 'Có điều kiện xuất hiện' : 'Chưa đặt điều kiện xuất hiện'}</p>}
    {collection === 'quests' && <QuestObjectives value={record.objectives} editable={editable} onChange={value => field('objectives', value)} />}
    {related && <RelatedRows section={related} code={record.code} bundle={bundle} savedBundle={savedBundle} catalog={catalog} editable={editable} forRuntimeLoot={runtimeLoot || lootSources.length > 0} outputItem={record.output_item_code} rollsMax={record.rolls_max} onChange={onRelatedChange} onError={report} />}
    {collection === 'items' && <ItemStatsEditor key={String(record.item_type)} record={record} saved={savedRecord} items={bundle.items} editable={editable}
      onChange={stats => field('stats', stats)} onError={report} />}
    {collection === 'skills' && <SkillLevelsEditor key={String(record.skill_type)} record={record} saved={savedRecord} editable={editable}
      source={catalog?.authoringBundle?.skills.find(skill => skill.skill_type === record.skill_type)} onChange={onChange} onError={report} />}
  </>;
}

export function ContentPage({ embedded = false }: { embedded?: boolean }) {
  const { state, execute, busy, reload } = useWorkspace(), { user } = useAuth();
  const { draftId } = useParams(), navigate = useNavigate();
  const [newLabel, setNewLabel] = useState(''), [creating, setCreating] = useState(false);
  const [pendingImportId, setResumeId] = useState<string>();
  const resumeId = state.drafts.some(draft => draft.id === pendingImportId && draft.status === 'archived') ? undefined : pendingImportId;
  const createDraft = useMutation({
    mutationFn: async (label: string) => {
      if (isDemoMode) {
        const next = await execute({ type: 'createDraft', title: label, label });
        return next.drafts[0].id;
      }
      const source = await gameCatalogApi.get();
      if (!source.authoringBundle) throw new Error('Unity source content is unavailable. Try again when the snapshot is ready.');
      const id = await contentApi.importUnity(source.authoringBundle, source.sourceHash, resumeId, label);
      setResumeId(id);
      await reload();
      return id;
    },
    onSuccess: id => {
      setCreating(false);
      setNewLabel('');
      setResumeId(undefined);
      navigate('/admin/content/' + id);
    },
    onError: error => { if (error instanceof UnityImportError) setResumeId(error.draftId); },
  });
  const drafts = state.drafts.filter(draft => (user?.role === 'admin' || draft.authorId === user?.id) && draft.status !== 'archived');
  const selected = draftId ? drafts.find(draft => draft.id === draftId) : drafts.find(draft => ['draft', 'rejected'].includes(draft.status)) || drafts[0];
  function create(event: React.FormEvent) {
    event.preventDefault();
    if (!createDraft.isPending && newLabel.trim()) createDraft.mutate(newLabel.trim());
  }
  if (draftId && state.drafts.some(draft => draft.id === draftId && (user?.role === 'admin' || draft.authorId === user?.id) && draft.status === 'archived')) {
    return <Navigate to="/admin/content" replace />;
  }
  const createAction = <Button disabled={createDraft.isPending} onClick={() => setCreating(!creating)}><Icon name="add" />Create draft</Button>;
  return <div className="sv-page">{embedded ? <div className="flex justify-end">{createAction}</div> : <PageHeading title="Content management" description="Edit game balancing and content tables." action={createAction} />}
    {creating && <form className="sv-panel flex flex-wrap items-end gap-3 p-5" onSubmit={create}>
      <Field className="min-w-60 flex-1"><FieldLabel htmlFor="new-version-label">Draft name</FieldLabel><Input id="new-version-label" required autoFocus maxLength={200} disabled={createDraft.isPending || !!resumeId} value={newLabel} onChange={event => setNewLabel(event.target.value)} placeholder="e.g. Map 02 balance pass" /></Field>
      <Button disabled={busy || createDraft.isPending || !newLabel.trim()}>{createDraft.isPending ? <><Spinner />{isDemoMode ? 'Creating draft…' : 'Loading Unity content…'}</> : resumeId ? 'Retry import' : 'Create draft'}</Button>
      <Button variant="outline" type="button" disabled={createDraft.isPending} onClick={() => setCreating(false)}>Close</Button>
      {!isDemoMode && <p className="basis-full text-sm text-muted-foreground">New drafts start with the current Unity snapshot.</p>}
      {createDraft.error && <p role="alert" className="basis-full whitespace-pre-wrap text-sm text-destructive">{errorMessage(createDraft.error)}</p>}
    </form>}
    <div className="sv-draft-picker">{drafts.map(draft => <Link key={draft.id} to={'/admin/content/' + draft.id} className={selected?.id === draft.id ? 'is-active' : ''}><span>#{draft.version_no} · {draft.label || draft.title}</span><Status value={draft.status} /></Link>)}</div>
    {selected ? isDemoMode ? <DraftEditor key={selected.id + ':' + selected.revision} draft={selected} /> : <ApiDraftEditor key={selected.id + ':' + selected.revision + ':' + selected.status + ':' + selected.updatedAt} id={selected.id} version={selected.revision + ':' + selected.status + ':' + selected.updatedAt} /> : <Empty title={draftId ? "Content version not found" : "Create your first draft"} />}
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
