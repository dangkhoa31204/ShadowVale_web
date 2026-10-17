import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collections } from './types';
import { Empty } from '../shared/ui';
import { displayValue } from '../shared/format';

export type ChangeKind = 'Added' | 'Updated' | 'Removed';
export interface Change { key: string; title: string; kind: ChangeKind; path: string; before: unknown; after: unknown }

const kindTone: Record<ChangeKind, string> = { Added: 'text-success', Updated: 'text-warning', Removed: 'text-destructive' };
const pre = 'min-w-0 overflow-x-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap [overflow-wrap:anywhere]';

/** Before/after rows of a content comparison. */
export function DiffList({ changes, beforeLabel, afterLabel }: { changes: Change[]; beforeLabel: string; afterLabel: string }) {
  if (!changes.length) return <Empty title="No content changes" />;
  return <div className="grid">
    <div className="grid grid-cols-2 gap-3 border-b bg-muted/40 px-6 py-2 text-xs text-muted-foreground"><span>{beforeLabel}</span><span>{afterLabel}</span></div>
    {changes.map(d => <div key={d.key} className="grid gap-2 border-b px-6 py-4 last:border-b-0">
      <strong className="flex flex-wrap items-center gap-2 text-sm font-medium">{d.title}<Badge variant="secondary" className={kindTone[d.kind]}>{d.kind}</Badge></strong>
      <small className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">{d.path}</small>
      <div className="grid grid-cols-2 gap-3">
        <pre className={pre + ' border-destructive/30 bg-destructive/5 text-destructive'}>{displayValue(d.before)}</pre>
        <pre className={pre + ' border-success/30 bg-success/5 text-success'}>{displayValue(d.after)}</pre>
      </div>
    </div>)}
  </div>;
}

/** Changes / Full content switch with the section filter used by every comparison view. */
export function ComparisonView({ changes, content, beforeLabel, afterLabel, summary, initialView = 'changes' }: { changes?: Change[]; content: (section: string) => ReactNode; beforeLabel: string; afterLabel: string; summary?: boolean; initialView?: 'changes' | 'content' }) {
  const [view, setView] = useState(changes ? initialView : 'content'), [section, setSection] = useState('all');
  const visible = (changes ?? []).filter(d => section === 'all' || d.path === '/' + section || d.path.startsWith('/' + section + '/'));
  return <div className="grid">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
      <Tabs value={view} onValueChange={value => setView(value as typeof view)}>
        <TabsList aria-label="Content view">{changes && <TabsTrigger value="changes">Changes ({changes.length})</TabsTrigger>}<TabsTrigger value="content">Full content</TabsTrigger></TabsList>
      </Tabs>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">Section<NativeSelect size="sm" value={section} onChange={e => setSection(e.target.value)}><NativeSelectOption value="all">All sections</NativeSelectOption>{collections.map(c => <NativeSelectOption key={c.key} value={c.key}>{c.label}</NativeSelectOption>)}</NativeSelect></label>
    </div>
    {view === 'changes' ? <>
      {summary && <div className="flex flex-wrap gap-5 border-b px-6 py-3 text-xs text-muted-foreground">{(['Added', 'Updated', 'Removed'] as ChangeKind[]).map(kind => <span key={kind}><b className="mr-1 text-sm text-foreground tabular-nums">{visible.filter(d => d.kind === kind).length}</b>{kind === 'Added' ? 'additions' : kind === 'Updated' ? 'updates' : 'removals'}</span>)}</div>}
      <DiffList changes={visible} beforeLabel={beforeLabel} afterLabel={afterLabel} />
    </> : content(section)}
  </div>;
}
