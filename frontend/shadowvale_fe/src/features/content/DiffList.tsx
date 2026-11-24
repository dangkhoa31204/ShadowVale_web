import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collections } from './types';
import { Empty } from '../shared/ui';
import { displayValue } from '../shared/format';
import { NumericComparison } from '../shared/NumericComparison';

export type ChangeKind = 'Added' | 'Updated' | 'Removed';
export interface Change { key: string; title: string; kind: ChangeKind; path: string; before: unknown; after: unknown; unit?: string }

const kindTone: Record<ChangeKind, string> = { Added: 'text-success', Updated: 'text-warning', Removed: 'text-destructive' };
const pre = 'min-w-0 overflow-x-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap [overflow-wrap:anywhere]';

function ChangeValues({ change, compact }: { change: Change; compact: boolean }) {
  const { before, after, unit } = change;
  if ((typeof before === 'number' && (typeof after === 'number' || after == null)) ||
    (before == null && typeof after === 'number')) {
    return <NumericComparison before={typeof before === 'number' ? before : null} after={typeof after === 'number' ? after : null}
      beforeLabel="Giá trị đối chiếu" afterLabel="Giá trị đề xuất" unit={unit} compact={compact} />;
  }
  const beforeText = displayValue(before), afterText = displayValue(after);
  const longValue = [before, after].some(value =>
    value != null && (typeof value === 'object' || typeof value === 'string' && (value.length > 120 || value.includes('\n'))));
  const values = <div className="grid grid-cols-2 gap-3">
    <pre className={pre + (compact ? ' max-h-72 px-2 py-1.5' : '') + ' border-destructive/30 bg-destructive/5 text-destructive'}>{beforeText}</pre>
    <pre className={pre + (compact ? ' max-h-72 px-2 py-1.5' : '') + ' border-success/30 bg-success/5 text-success'}>{afterText}</pre>
  </div>;
  return compact && longValue
    ? <details className="text-xs"><summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">View change details</summary><div className="pt-2">{values}</div></details>
    : values;
}

/** Before/after rows of a content comparison. */
export function DiffList({ changes, beforeLabel, afterLabel, compact = false }: { changes: Change[]; beforeLabel: string; afterLabel: string; compact?: boolean }) {
  if (!changes.length) return <Empty title="No content changes" />;
  return <div className="grid">
    <div className="grid grid-cols-2 gap-3 border-b bg-muted/40 px-6 py-2 text-xs text-muted-foreground"><span>{beforeLabel}</span><span>{afterLabel}</span></div>
    {changes.map(d => <div key={d.key} className={`grid border-b px-6 last:border-b-0 ${compact ? 'gap-1 py-2.5' : 'gap-2 py-4'}`}>
      <strong className="flex flex-wrap items-center gap-2 text-sm font-medium">{d.title}<Badge variant="secondary" className={kindTone[d.kind]}>{d.kind}</Badge></strong>
      {!compact && <small className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">{d.path}</small>}
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
  const selected = sections[compact ? view : 'changes'];
  const section = options.some(option => option.key === selected) ? selected : 'all';
  const visible = (changes ?? []).filter(d => section === 'all' || d.path === '/' + section || d.path.startsWith('/' + section + '/'));
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const activePage = Math.min(page, pages);
  const start = (activePage - 1) * pageSize;
  const rows = compact ? visible.slice(start, start + pageSize) : visible;
  return <div className="grid">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
      <Tabs value={view} onValueChange={value => setView(value as typeof view)}>
        <TabsList aria-label="Content view">{changes && <TabsTrigger value="changes">Changes ({changes.length})</TabsTrigger>}<TabsTrigger value="content">Full content</TabsTrigger></TabsList>
      </Tabs>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">Section<NativeSelect size="sm" value={section} onChange={event => {
        const value = event.target.value;
        setSections(current => ({ ...current, [compact ? view : 'changes']: value }));
        setPage(1);
      }}><NativeSelectOption value="all">All sections</NativeSelectOption>{options.map(c => <NativeSelectOption key={c.key} value={c.key}>{c.label}{compact && view === 'changes' ? ` (${sectionCounts.get(c.key)})` : ''}</NativeSelectOption>)}</NativeSelect></label>
    </div>
    {view === 'changes' ? <>
      {summary && <div className="flex flex-wrap gap-5 border-b px-6 py-3 text-xs text-muted-foreground">{(['Added', 'Updated', 'Removed'] as ChangeKind[]).map(kind => <span key={kind}><b className="mr-1 text-sm text-foreground tabular-nums">{visible.filter(d => d.kind === kind).length}</b>{kind === 'Added' ? 'additions' : kind === 'Updated' ? 'updates' : 'removals'}</span>)}</div>}
      <DiffList changes={rows} beforeLabel={beforeLabel} afterLabel={afterLabel} compact={compact} />
      {compact && pages > 1 && <div className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-2">
        <span aria-live="polite" className="text-xs text-muted-foreground">Changes {start + 1}–{start + rows.length} of {visible.length}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={activePage === pages} onClick={() => setPage(activePage + 1)}>Next</Button>
        </div>
      </div>}
    </> : content(section)}
  </div>;
}
