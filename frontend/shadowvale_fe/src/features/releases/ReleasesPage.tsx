import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../../hooks/useAuth';
import { can } from '../auth/access';
import { useWorkspace } from '../content/workspaceContext';
import { BundleDetails } from '../content/BundleDetails';
import { Empty, Icon, PageHeading, Panel, Status, panelTable } from '../shared/ui';
import { Modal } from '../shared/Modal';
import { dateLabel } from '../shared/format';
import { isDemoMode } from '../../config/environment';
import { ApiReleasesPage } from './ApiVersions';


export function ReleasesPage() { return isDemoMode ? <DemoReleasesPage /> : <ApiReleasesPage />; }
function DemoReleasesPage() {
  const { state, execute, busy } = useWorkspace(), { user } = useAuth();
  const visibleReleases = state.releases.filter(r => user?.role !== 'designer' || r.status !== 'archived');
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  const [beforeId, setBeforeId] = useState(visibleReleases[1]?.id || visibleReleases[0]?.id || '');
  const [afterId, setAfterId] = useState(visibleReleases[0]?.id || '');
  const [confirm, setConfirm] = useState<{ id: string } | null>(null);
  const [reason, setReason] = useState('');
  const [detailId, setDetailId] = useState('');
  const detailRef = useRef<HTMLElement>(null);
  const before = visibleReleases.find(r => r.id === beforeId), after = visibleReleases.find(r => r.id === afterId);
  const approved = state.drafts.filter(d => d.status === 'approved');
  const canPublish = !!user && can(user.role, 'publish');
  const target = state.releases.find(r => r.id === confirm?.id);

  useEffect(() => {
    if (detailId) detailRef.current?.scrollIntoView({ block: 'nearest' });
  }, [detailId]);

  function closeDetails() {
    document.getElementById('release-toggle-' + detailId)?.focus();
    setDetailId('');
  }
  // Proposal: one-click publish of an approved version; only rollback asks for a reason.
  async function publish(id: string, revision: number) {
    try { await execute({ type: 'publishDraft', id, revision }); } catch { /* Provider displays the error. */ }
  }
  async function rollback() {
    if (!confirm || !reason.trim()) return;
    try {
      await execute({ type: 'restoreRelease', id: confirm.id, reason });
      setConfirm(null); setReason('');
    } catch { /* Provider displays the error. */ }
  }
  function versionName(id: string | null) {
    if (!id) return '—';
    const version = state.drafts.find(d => d.id === id) || state.releases.find(r => r.sourceDraftId === id);
    return version ? '#' + version.version_no : id;
  }
  const versionOptions = visibleReleases.map(r => <NativeSelectOption key={r.id} value={r.id}>#{r.version_no} · {r.label}</NativeSelectOption>);

  return <div className="sv-page">
    <PageHeading title={canPublish ? "Publish versions" : "Versions"} />
    {active && <Panel><div className="flex flex-wrap items-center justify-between gap-4 p-6">
      <div className="flex items-center gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon name="deployed_code" className="size-5" /></span><div><span className="sv-eyebrow">Published content</span><h2 className="text-lg font-semibold">#{active.version_no} · {active.label}</h2><p className="text-sm text-muted-foreground">{dateLabel(active.publishedAt)} · {active.publishedBy}</p></div></div>
    </div></Panel>}

    {canPublish && <Panel title="Approved content" action={<Badge variant="secondary">{approved.length}</Badge>}>
      {approved.length ? approved.map(d => <div className="flex flex-wrap items-center gap-4 border-b px-6 py-4 last:border-b-0" key={d.id}>
        <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{d.label}</strong><small className="text-xs text-muted-foreground">#{d.version_no} · Reviewed by {d.reviewedBy || '—'}</small></div>
        <div className="flex gap-2"><Button asChild variant="outline"><Link to={'/admin/reviews?draft=' + encodeURIComponent(d.id)}>View changes</Link></Button><Button disabled={busy} onClick={() => void publish(d.id, d.revision)}>Publish version</Button></div>
      </div>) : <Empty title="No approved content" />}
    </Panel>}

    <Panel title="Content versions">
      <Table className={panelTable}>
        <TableHeader><TableRow>{['Version', 'Label', 'Published', 'Published by', 'Status', 'Actions'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{visibleReleases.map(r => {
          const parentId = state.drafts.find(d => d.id === r.sourceDraftId)?.parent_version_id;
          const baseline = state.releases.find(entry => entry.sourceDraftId === parentId);
          return <Fragment key={r.id}>
            <TableRow data-state={detailId === r.id ? 'selected' : undefined}>
              <TableCell className="font-mono font-medium">#{r.version_no}</TableCell><TableCell>{r.label}</TableCell>
              <TableCell>{dateLabel(r.publishedAt)}</TableCell><TableCell>{r.publishedBy}</TableCell><TableCell><Status value={r.status} /></TableCell>
              <TableCell><div className="flex gap-2">
                {canPublish && <Button variant="outline" size="sm" id={'release-toggle-' + r.id} aria-expanded={detailId === r.id} aria-controls={'release-detail-' + r.id} onClick={() => setDetailId(detailId === r.id ? '' : r.id)}>{detailId === r.id ? "Hide changes" : "View changes"}</Button>}
                {canPublish && r.status === 'archived' && <Button variant="outline" size="sm" disabled={busy} onClick={() => { setReason(''); setConfirm({ id: r.id }); }}>Rollback</Button>}
              </div></TableCell>
            </TableRow>
            {detailId === r.id && <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="p-0 whitespace-normal">
              <section ref={detailRef} id={'release-detail-' + r.id} aria-label={"Changes for version " + r.version_no}>
                <div className="flex items-start justify-between gap-4 px-6 py-4"><div><h3 className="font-semibold">#{r.version_no} · {r.label}</h3>{r.changelog && <p className="text-sm text-muted-foreground">{r.changelog}</p>}</div><Button variant="outline" size="sm" onClick={closeDetails}>Close</Button></div>
                <BundleDetails before={baseline?.bundle} after={r.bundle} />
              </section>
            </TableCell></TableRow>}
          </Fragment>;
        })}</TableBody>
      </Table>
    </Panel>

    {canPublish && <Panel title="Publication history">
      {state.publications.length ? <Table className={panelTable}>
        <TableHeader><TableRow>{['Action', 'Version', 'Previous version', 'Reason', 'Actor', 'Occurred'].map(label => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{state.publications.map(entry => <TableRow key={entry.id}>
          <TableCell>{entry.action === 'publish' ? "Publish" : "Rollback"}</TableCell><TableCell>{versionName(entry.content_version_id)}</TableCell><TableCell>{versionName(entry.previous_version_id)}</TableCell>
          <TableCell className="max-w-80 whitespace-normal">{entry.reason || '—'}</TableCell><TableCell>{state.users.find(u => u.id === entry.actor_id)?.callsign || entry.actor_id || '—'}</TableCell><TableCell>{dateLabel(entry.occurred_at)}</TableCell>
        </TableRow>)}</TableBody>
      </Table> : <Empty title="No publication history" />}
    </Panel>}

    <Panel title="Compare versions">
      <div className="grid items-end gap-4 border-b p-6 sm:grid-cols-[1fr_auto_1fr]">
        <Field><FieldLabel htmlFor="compare-from">From</FieldLabel><NativeSelect id="compare-from" className="w-full" value={beforeId} onChange={e => setBeforeId(e.target.value)}>{versionOptions}</NativeSelect></Field>
        <Icon name="arrow_forward" className="mb-2 hidden text-muted-foreground sm:block" />
        <Field><FieldLabel htmlFor="compare-to">To</FieldLabel><NativeSelect id="compare-to" className="w-full" value={afterId} onChange={e => setAfterId(e.target.value)}>{versionOptions}</NativeSelect></Field>
      </div>
      {after ? <BundleDetails key={beforeId + afterId} before={before?.bundle} after={after.bundle} /> : <Empty title="No versions" />}
    </Panel>

    {confirm && <Modal title={'Rollback to version #' + target?.version_no + '?'} description={target?.label} busy={busy} onClose={() => setConfirm(null)}>
      <form className="grid gap-4" onSubmit={e => { e.preventDefault(); void rollback(); }}>
        <Field><FieldLabel htmlFor="release-reason">Reason</FieldLabel><Textarea id="release-reason" autoFocus required value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why roll back to this version?" /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button><Button disabled={busy || !reason.trim() || !target}>{busy && <Spinner />}{busy ? "Saving…" : "Rollback version"}</Button></div>
      </form>
    </Modal>}
  </div>;
}
