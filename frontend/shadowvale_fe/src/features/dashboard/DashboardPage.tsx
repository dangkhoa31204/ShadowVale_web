import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../content/workspaceContext';
import { can } from '../auth/access';
import { ActivityList, Empty, Icon, PageHeading, Panel, StatCard, Status, panelTable } from '../shared/ui';
import { dateLabel } from '../shared/format';
import { isDemoMode } from '../../config/environment';
import { ApiDashboard } from './ApiDashboard';
import { AdminDashboard } from './AdminDashboard';
export function InternalDashboardPage() { const { user } = useAuth(); return user?.role === 'admin' ? <AdminDashboard /> : isDemoMode ? <DemoDashboard /> : <ApiDashboard />; }
function DemoDashboard() {
  const { user } = useAuth(), { state } = useWorkspace();
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  const drafts = user?.role === 'designer' ? state.drafts.filter(d => d.authorId === user.id) : state.drafts;
  const author = !!user && can(user.role, 'author');
  return <div className="sv-page">
    <PageHeading eyebrow="DESIGNER" title="Overview" description="Content versions and recent activity." action={author && <Button asChild><Link to="/admin/content"><Icon name="edit_note" />Content versions</Link></Button>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Drafts & returned" value={drafts.filter(d => ['draft', 'rejected'].includes(d.status)).length} detail="Draft or rejected" icon="edit_note" />
      <StatCard label="In review" value={drafts.filter(d => d.status === 'in_review').length} detail="Waiting for approval" icon="fact_check" />
      <StatCard label="Published version" value={active ? '#' + active.version_no : '—'} detail={active ? active.label : 'No published bundle'} icon="deployed_code" />
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
      <Panel title="Recent content versions" action={author && <Button asChild variant="ghost" size="sm"><Link to="/admin/content">View all<Icon name="arrow_forward" /></Link></Button>}>
        {drafts.length ? <Table className={panelTable}><TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Status</TableHead><TableHead>Version no.</TableHead><TableHead /></TableRow></TableHeader><TableBody>{drafts.slice(0, 5).map(d => <TableRow key={d.id}>
          <TableCell><div className="font-medium">{d.label}</div><div className="text-xs text-muted-foreground">{d.authorName} · {dateLabel(d.updatedAt)}</div></TableCell>
          <TableCell><Status value={d.status} /></TableCell><TableCell className="font-mono">#{d.version_no}</TableCell>
          <TableCell>{author && <Button asChild variant="ghost" size="icon-sm"><Link aria-label={'Open ' + d.label} to={'/admin/content/' + d.id}><Icon name="arrow_outward" /></Link></Button>}</TableCell>
        </TableRow>)}</TableBody></Table> : <Empty title="No content versions" description="Create a draft from a published version." />}
      </Panel>
      <Panel title="Recent activity" action={<Icon name="history" className="text-muted-foreground" />}><ActivityList items={state.audit.slice(0, 5)} empty="No recent activity" /></Panel>
    </div>
  </div>;
}
