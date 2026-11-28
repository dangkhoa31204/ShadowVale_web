import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collections } from './types';
import { Empty } from '../shared/ui';
import { ContentValue } from './ContentValue';
import { changedFields } from './comparisonFields';
import { NumericComparison } from '../shared/NumericComparison';

export type ChangeKind = 'Added' | 'Updated' | 'Removed';
export interface Change { key: string; title: string; kind: ChangeKind; path: string; before: unknown; after: unknown; unit?: string }

const kindTone: Record<ChangeKind, string> = { Added: 'text-success', Updated: 'text-warning', Removed: 'text-destructive' };
const valueCell = 'min-w-0 rounded-md border bg-muted/20 px-3 py-2 text-xs';

function ValuePair({ before, after, unit, compact }: Pick<Change, 'before' | 'after' | 'unit'> & { compact: boolean }) {
  if ((typeof before === 'number' && (typeof after === 'number' || after == null)) ||
    (before == null && typeof after === 'number')) {
    return <NumericComparison before={typeof before === 'number' ? before : null} after={typeof after === 'number' ? after : null}
      beforeLabel="Before" afterLabel="After" unit={unit} compact={compact} />;
  }
  return <div className="grid grid-cols-2 gap-3">
    <div className={valueCell}><span className="sr-only">Before </span><ContentValue value={before} /></div>
    <div className={valueCell}><span className="sr-only">After </span><ContentValue value={after} /></div>
  </div>;
}

function ChangeValues({ change, compact }: { change: Change; compact: boolean }) {
  const { before, after, kind, path } = change;
  const isStructured = [before, after].some(value => value !== null && typeof value === 'object');
  if (!isStructured) return <ValuePair {...change} compact={compact} />;

  const collection = collections.find(entry => entry.key === path.split('/')[1])?.key;
  const addedOrRemoved = kind === 'Added' || kind === 'Removed';
  const wholeRecord = path.split('/').length === 3;
  const fields = addedOrRemoved ? [] : changedFields(before, after);
  return <details className="text-xs">
    <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">
      {addedOrRemoved ? (kind === 'Added' ? 'View added fields' : 'View removed fields') : 'View change details'}
    </summary>
    <div className="mt-2 grid gap-2">
      {addedOrRemoved
        ? <div className={valueCell}><ContentValue value={kind === 'Added' ? after : before} collection={wholeRecord ? collection : undefined} /></div>
        : fields.map(field => <div key={field.path} className="grid gap-1">
          {field.label && <span className="font-medium">{field.label}</span>}
          <ValuePair before={field.before} after={field.after} unit={change.unit} compact />
        </div>)}
    </div>
  </details>;
}

/** Before/after rows of a content comparison. */
export function DiffList({ changes, beforeLabel, afterLabel, compact = false }: { changes: Change[]; beforeLabel: string; afterLabel: string; compact?: boolean }) {
  if (!changes.length) return <Empty title="No content changes" />;
  return <div className="grid">
    <div className="grid grid-cols-2 gap-3 border-b bg-muted/40 px-6 py-2 text-xs text-muted-foreground"><span>{beforeLabel}</span><span>{afterLabel}</span></div>
    {changes.map(d => <div key={d.key} className={`grid border-b px-6 last:border-b-0 ${compact ? 'gap-1 py-2.5' : 'gap-2 py-4'}`}>
      <strong className="flex flex-wrap items-center gap-2 text-sm font-medium">{d.title}<Badge variant="secondary" className={kindTone[d.kind]}>{d.kind}</Badge></strong>

      <ChangeValues change={d} compact={compact} />
    </div>)}
  </div>;
}

/** Changes / Full content switch with the section filter used by every comparison view. */
export function ComparisonView({ changes, content, beforeLabel, afterLabel, summary, compact = false, initialView = 'changes' }: { changes?: Change[]; content: (section: string) => ReactNode; beforeLabel: string; afterLabel: string; summary?: boolean; compact?: boolean; initialView?: 'changes' | 'content' }) {
  const [view, setView] = useState(changes ? initialView : 'content');
  const [sections, setSections] = useState({ changes: 'all', content: 'all' });
  const [page, setPage] = useState(1);
  const sectionCounts = new Map<string, number>();
  for (const change of changes ?? []) {
    const key = change.path.split('/')[1];
    sectionCounts.set(key, (sectionCounts.get(key) ?? 0) + 1);
  }
  const options = collections.filter(collection => !compact || view === 'content' || sectionCounts.has(collection.key));
  const selected = sections[view];
  const section = options.some(option => option.key === selected) ? selected : 'all';
  const visible = (changes ?? []).filter(d => section === 'all' || d.path === '/' + section || d.path.startsWith('/' + section + '/'));
  const pageSize = compact ? 6 : 10;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const activePage = Math.min(page, pages);
  const start = (activePage - 1) * pageSize;
  const rows = visible.slice(start, start + pageSize);
  return <div className="grid">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
      <Tabs value={view} onValueChange={value => setView(value as typeof view)}>
        <TabsList aria-label="Content view">{changes && <TabsTrigger value="changes">Changes ({changes.length})</TabsTrigger>}<TabsTrigger value="content">Full content</TabsTrigger></TabsList>
      </Tabs>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">Section<NativeSelect size="sm" value={section} onChange={event => {
        const value = event.target.value;
        setSections(current => ({ ...current, [view]: value }));
        setPage(1);
      }}><NativeSelectOption value="all">All sections</NativeSelectOption>{options.map(c => <NativeSelectOption key={c.key} value={c.key}>{c.label}{compact && view === 'changes' ? ` (${sectionCounts.get(c.key)})` : ''}</NativeSelectOption>)}</NativeSelect></label>
    </div>
    {view === 'changes' ? <>
      {summary && <div className="flex flex-wrap gap-5 border-b px-6 py-3 text-xs text-muted-foreground">{(['Added', 'Updated', 'Removed'] as ChangeKind[]).map(kind => <span key={kind}><b className="mr-1 text-sm text-foreground tabular-nums">{visible.filter(d => d.kind === kind).length}</b>{kind === 'Added' ? 'additions' : kind === 'Updated' ? 'updates' : 'removals'}</span>)}</div>}
      <DiffList changes={rows} beforeLabel={beforeLabel} afterLabel={afterLabel} compact={compact} />
      {pages > 1 && <div className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-2">
        <span aria-live="polite" className="text-xs text-muted-foreground">Changes {start + 1}–{start + rows.length} of {visible.length}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={activePage === pages} onClick={() => setPage(activePage + 1)}>Next</Button>
        </div>
      </div>}
    </> : content(section)}
  </div>;
}
