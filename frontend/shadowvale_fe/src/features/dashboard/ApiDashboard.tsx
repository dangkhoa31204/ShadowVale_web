import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWorkspace } from '../content/workspaceContext';
import { useAuth } from '../../hooks/useAuth';
import { contentApi } from '../content/contentApi';
import { errorMessage } from '../../services/api/errors';
import { resources } from '../content/apiModel';
import { collections, type ContentBundle } from '../content/types';
import { ActivityList, Empty, Icon, PageHeading, Panel, StatCard, Status, panelTable } from '../shared/ui';
import { dateLabel } from '../shared/format';
export function ApiDashboard(){
 const {state}=useWorkspace(),{user}=useAuth();
 const active=state.releases.find(r=>r.id===state.activeReleaseId);
 // Resource counts of the published version; a published version never changes, so it is fetched once.
 const published=useQuery({queryKey:['content-version',active?.id],queryFn:()=>contentApi.details(active!.id),enabled:!!active,staleTime:Infinity,
  select:v=>{const b=v.bundle as ContentBundle;return Object.fromEntries(resources.map(([key])=>[key,b[key]?.length||0])) as Record<string,number>;}});
 const counts=published.data;
 const drafts=user?.role==='designer'?state.drafts.filter(d=>d.authorId===user.id):state.drafts;
 if(user?.role==='analyst')return <div className="sv-page"><PageHeading title="Overview"/><Alert><AlertDescription>The current BE restricts content version metadata and publication history to Admin/Designer. Use Analytics for game data.</AlertDescription></Alert><Button asChild variant="outline" className="w-fit"><Link to="/admin/analytics">Analytics</Link></Button></div>;
 return <div className="sv-page"><PageHeading title="Overview" description="Content versions and publication activity." action={<Button asChild><Link to={user?.role==='designer'?'/admin/content':'/admin/analytics'}>{user?.role==='designer'?"Content authoring":"Analytics"}</Link></Button>}/>
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <StatCard label="Published version" value={active?'#'+active.version_no:'—'} icon="deployed_code"/>
  <StatCard label="Content resources" value={counts?Object.values(counts).reduce((sum,v)=>sum+v,0):'—'} icon="inventory_2"/>
  <StatCard label="Drafts & returned" value={drafts.filter(d=>['draft','rejected'].includes(d.status)).length} icon="edit_note"/>
  <StatCard label="In review" value={drafts.filter(d=>d.status==='in_review').length} icon="fact_check"/>
 </div>
 {published.error&&<Alert variant="destructive"><AlertDescription>{errorMessage(published.error)}</AlertDescription></Alert>}
 <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
  <Panel title="Recent content versions">{drafts.length?<Table className={panelTable}><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Label</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{drafts.slice(0,5).map(d=><TableRow key={d.id}><TableCell className="font-mono">#{d.version_no}</TableCell><TableCell>{user?.role==='designer'?<Link className="underline-offset-4 hover:underline" to={'/admin/content/'+d.id}>{d.label}</Link>:d.label}</TableCell><TableCell><Status value={d.status}/></TableCell><TableCell>{dateLabel(d.updatedAt)}</TableCell></TableRow>)}</TableBody></Table>:<Empty title="No content versions"/>}</Panel>
  <Panel title="Publication activity" action={<Icon name="history" className="text-muted-foreground"/>}><ActivityList items={state.audit.slice(0,5)} empty="No publication history"/></Panel>
 </div>
 <Panel title="Published content" action={<Button asChild variant="ghost" size="sm"><Link to="/admin/releases">Versions</Link></Button>}>{counts?<ContentCounts counts={counts}/>:<Empty title="No published content"/>}</Panel></div>;
}
export function ContentCounts({counts}:{counts:Record<string,number>}){
 return <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">{collections.map(c=><div key={c.key} className="grid gap-1 bg-card p-5"><Icon name={c.icon} className="text-muted-foreground"/><strong className="text-2xl font-semibold tabular-nums">{counts[c.key]??0}</strong><span className="text-xs text-muted-foreground">{c.label}</span></div>)}</div>;
}
