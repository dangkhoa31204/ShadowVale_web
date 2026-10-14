import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWorkspace } from '../content/workspaceContext';
import { useAuth } from '../../hooks/useAuth';
import { Empty, PageHeading, Panel, StatCard, Status, panelTable } from '../shared/ui';
import { dateLabel } from '../shared/format';
export function ApiDashboard(){
 const {state}=useWorkspace(),{user}=useAuth();
 const active=state.releases.find(r=>r.id===state.activeReleaseId);
 const drafts=user?.role==='designer'?state.drafts.filter(d=>d.authorId===user.id):state.drafts;
 return <div className="sv-page"><PageHeading title="Overview" description="Your content versions and the published version." action={<Button asChild><Link to="/admin/content">Content authoring</Link></Button>}/>
 <div className="grid gap-4 sm:grid-cols-3">
  <StatCard label="Published version" value={active?'#'+active.version_no:'—'} icon="deployed_code"/>
  <StatCard label="Drafts & returned" value={drafts.filter(d=>['draft','rejected'].includes(d.status)).length} icon="edit_note"/>
  <StatCard label="In review" value={drafts.filter(d=>d.status==='in_review').length} icon="fact_check"/>
 </div>
 <Panel title="Recent content versions">{drafts.length?<Table className={panelTable}><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Label</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{drafts.slice(0,5).map(d=><TableRow key={d.id}><TableCell className="font-mono">#{d.version_no}</TableCell><TableCell>{user?.role==='designer'?<Link className="underline-offset-4 hover:underline" to={'/admin/content/'+d.id}>{d.label}</Link>:d.label}</TableCell><TableCell><Status value={d.status}/></TableCell><TableCell>{dateLabel(d.updatedAt)}</TableCell></TableRow>)}</TableBody></Table>:<Empty title="No content versions"/>}</Panel></div>;
}
