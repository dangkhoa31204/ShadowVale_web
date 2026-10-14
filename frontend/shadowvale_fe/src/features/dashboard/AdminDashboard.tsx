import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '../content/workspaceContext';
import { dateLabel } from '../shared/format';
import { ActivityList, Empty, Icon, PageHeading, Panel, StatCard, Status } from '../shared/ui';

function TaskRow({ title, detail, to, action }: { title: string; detail: string; to: string; action: string }) {
  return <div className="flex items-center gap-4 border-b px-6 py-4 last:border-b-0">
    <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{title}</strong><small className="text-xs text-muted-foreground">{detail}</small></div>
    <Button asChild variant="outline" size="sm"><Link to={to}>{action}<Icon name="arrow_forward" /></Link></Button>
  </div>;
}

export function AdminDashboard() {
  const { state, reload, busy } = useWorkspace();
  const pending = state.drafts.filter(d => d.status === 'in_review').sort((a,b) => (a.submitted_at || a.updatedAt).localeCompare(b.submitted_at || b.updatedAt));
  const approved = state.drafts.filter(d => d.status === 'approved');
  const rejected = state.drafts.filter(d => d.status === 'rejected');
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  return <div className="sv-page">
    <PageHeading eyebrow="CONTENT OPERATIONS" title="Dashboard" description="Review submissions and manage game content releases." action={<Button variant="outline" disabled={busy} onClick={() => void reload()}><Icon name="sync"/>Refresh</Button>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Awaiting review" value={pending.length} detail="Needs your decision" icon="fact_check" to="/admin/reviews" />
      <StatCard label="Ready to publish" value={approved.length} detail="Approved content" icon="deployed_code" to="/admin/releases" />
      <StatCard label="Returned to designer" value={rejected.length} detail="Awaiting revisions" icon="undo" to="/admin/reviews?status=rejected" />
      <StatCard label="Live version" value={active ? '#' + active.version_no : '—'} detail={active?.label || 'No published version'} icon="public" to="/admin/releases" />
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Awaiting your review" description="Oldest submissions first" action={<Button asChild variant="ghost" size="sm"><Link to="/admin/reviews">View queue<Icon name="arrow_forward"/></Link></Button>}>
        {pending.slice(0,5).map(d => <TaskRow key={d.id} title={'#' + d.version_no + ' · ' + d.label} detail={d.authorName + ' · ' + dateLabel(d.submitted_at || d.updatedAt)} to={'/admin/reviews?draft=' + d.id} action="Review" />)}
        {!pending.length && <Empty title="You're up to date" description="New submissions from designers will appear here."/>}
      </Panel>
      <Panel title="Ready for release" description="Approved and waiting to publish" action={<Badge variant="secondary">{approved.length}</Badge>}>
        {approved.slice(0,4).map(d => <TaskRow key={d.id} title={'#' + d.version_no + ' · ' + d.label} detail={'Reviewed ' + dateLabel(d.reviewedAt || d.updatedAt)} to="/admin/releases" action="Open" />)}
        {!approved.length && <Empty title="No releases waiting" description="Approved submissions appear here before publication."/>}
      </Panel>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Live content" action={<Status value={active ? 'published' : 'inactive'}/>}>
        {active ? <div className="grid gap-2 p-6"><span className="sv-eyebrow">CURRENT GAME VERSION</span><h3 className="text-xl font-semibold">#{active.version_no} · {active.label}</h3><p className="text-sm text-muted-foreground">{active.changelog || 'Published content bundle'}</p><small className="text-xs text-muted-foreground">Published {dateLabel(active.publishedAt)} · {active.publishedBy}</small><Button asChild variant="outline" className="mt-2 w-fit"><Link to="/admin/releases">Manage versions<Icon name="arrow_forward"/></Link></Button></div>
          : <Empty title="No live version" description="Publish an approved bundle to make it available to the game."/>}
      </Panel>
      <Panel title="Publication activity" action={<Icon name="history" className="text-muted-foreground"/>}><ActivityList items={state.audit.slice(0,5)} empty="No publication activity" /></Panel>
    </div>
  </div>;
}
