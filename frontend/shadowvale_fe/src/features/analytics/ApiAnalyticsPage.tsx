import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { HorizontalBars } from './charts';
import { analyticsApi, type AnalyticsFilters } from './analyticsApi';
import { SolverConfigurations } from './SolverConfigurations';
import { useWorkspace } from '../content/workspaceContext';
import { contentApi } from '../content/contentApi';
import { errorMessage } from '../../services/api/errors';
import type { HeatmapDto, AiComparisonRowDto } from '../../services/api/contracts';
import { Empty, PageHeading, Panel, panelTable } from '../shared/ui';
import { NumericControl } from '../shared/NumericControl';
type Gameplay=Awaited<ReturnType<typeof analyticsApi.gameplay>>;
type Data={gameplay?:Gameplay;heatmap?:HeatmapDto;comparison?:AiComparisonRowDto[]};
const num=(v:unknown)=>v===null||v===undefined?'—':Number(v).toLocaleString('en-GB',{maximumFractionDigits:2});
const pct=(v:unknown)=>v===null||v===undefined?'—':(Number(v)*100).toFixed(1)+'%';
const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function MetricsTable({headers,rows}:{headers:string[];rows:React.ReactNode[][]}){
 return rows.length?<Table className={cn(panelTable,'tabular-nums')}><TableHeader><TableRow>{headers.map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row,i)=><TableRow key={i}>{row.map((v,j)=><TableCell key={j}>{v}</TableCell>)}</TableRow>)}</TableBody></Table>:<Empty title="No data for these filters"/>;}
// Proposal distributions: mission completion funnel, weapon usage and stealth vs combat.
function GameplayPanels({data}:{data:Gameplay}){
  const playstyle=data.playstyle;
  return <>
    <Panel title="Mission funnel" description="Sessions per step and share of started sessions"><HorizontalBars unit="Sessions" rows={[{label:'Started',value:Number(data.funnel.sessionsStarted),detail:num(data.funnel.sessionsStarted)},...data.funnel.objectives.map(r=>({label:'Objective '+r.objectiveIndex,value:Number(r.sessions),detail:num(r.sessions)+' · '+pct(r.shareOfStarted)})),{label:'Completed',value:Number(data.funnel.missionsCompleted),detail:num(data.funnel.missionsCompleted)+' · '+pct(data.funnel.completionRate)}]}/></Panel>
    <Panel title="Weapon usage" description="Shots per weapon"><HorizontalBars unit="Shots" rows={data.weapons.weapons.map(r=>({label:r.weapon,value:Number(r.shots),detail:num(r.shots)+' shots'}))}/></Panel>
    <Panel title="Stealth and combat" description="Finished sessions by stealth ratio"><HorizontalBars unit="Sessions" rows={playstyle.stealthRatioHistogram.map(r=>({label:pct(r.from)+'–'+pct(r.to),value:Number(r.sessions),detail:num(r.sessions)+' · '+pct(Number(r.sessions)/Math.max(1,Number(playstyle.finishedSessions)))}))}/></Panel>
  </>;
}
function Heatmap({data}:{data:HeatmapDto}){
  if(!data.cells.length)return <Empty title="No spatial events"/>;
  const size=Number(data.cellSize),minX=Math.min(...data.cells.map(c=>Number(c.x))),minY=Math.min(...data.cells.map(c=>Number(c.y)));
  const width=Math.max(size,Math.max(...data.cells.map(c=>Number(c.x)))-minX+size),height=Math.max(size,Math.max(...data.cells.map(c=>Number(c.y)))-minY+size);
  const max=Math.max(1,...data.cells.map(c=>Number(c.count)));
  // Sequential: one hue, opacity grows with the event count.
  return <div className="grid gap-3 px-6 pb-6"><svg role="img" aria-label={"Difficulty heatmap for "+data.mapCode} viewBox={`${minX} ${minY} ${width} ${height}`} className="h-90 w-full rounded-lg bg-muted">{data.cells.map(c=><rect key={c.x+':'+c.y} x={Number(c.x)} y={Number(c.y)} width={size} height={size} fill="var(--chart-3)" fillOpacity={0.15+0.85*Number(c.count)/max} stroke="var(--muted)" strokeWidth={size*0.06}><title>X {c.x}, Z {c.y}: {c.count} events</title></rect>)}</svg>
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>1 event</span><span className="h-2 w-32 rounded-sm bg-linear-to-r from-chart-3/15 to-chart-3"/><span>{max} events</span><span>· World X / Z · {size} m cells · {data.eventTypes.join(', ')}</span></div></div>;
}
const tabs=[['gameplay','Gameplay'],['heatmap','Heatmap'],['comparison','AI comparison'],['solvers','Solver configurations']] as const;
type Tab=typeof tabs[number][0];
export function ApiAnalyticsPage(){
  const {state}=useWorkspace(),{user}=useAuth(),analyst=user?.role==='analyst';
  const [tab,setTab]=useState<Tab>('gameplay'),[from,setFrom]=useState(()=>new Date(Date.now()-7*86400000).toISOString().slice(0,10)),[to,setTo]=useState(()=>new Date().toISOString().slice(0,10)),[source,setSource]=useState<'human'|'replay'>('human');
  const [version,setVersion]=useState(''),[map,setMap]=useState(''),[family,setFamily]=useState(''),[solver,setSolver]=useState(''),[group,setGroup]=useState('configuration');
  const [cell,setCell]=useState(5),[cellError,setCellError]=useState(''),[event,setEvent]=useState('player_death');
  const enums=useQuery({queryKey:['enums'],queryFn:contentApi.enums,staleTime:Infinity});
  const solvers=useQuery({queryKey:['solver-configurations'],queryFn:({signal})=>analyticsApi.solvers(signal)});
  const start=new Date(from+'T00:00:00'),end=new Date(to+'T23:59:59.999');
  const validVersionIds=!version||guid.test(version);
  const validDates=Number.isFinite(start.getTime())&&Number.isFinite(end.getTime())&&end>=start&&(end.getTime()-start.getTime())<=366*86400000;
  const query:AnalyticsFilters={source,from:validDates?start.toISOString():'',to:validDates?end.toISOString():'',...(version?{contentVersionId:version}:{}),...(map.trim()?{mapCode:map.trim()}:{}),...(family?{family}:{}),...(solver?{solverConfigurationId:solver}:{})};
  const needsInput=tab==='heatmap'&&!map.trim();
  const extra=tab==='heatmap'?{cell,event}:tab==='comparison'?{group}:{};
  const analytics=useQuery({
    queryKey:['analytics',tab,query,extra],
    enabled:tab!=='solvers'&&validDates&&validVersionIds&&!needsInput&&!(tab==='heatmap'&&cellError),
    queryFn:async({signal}):Promise<Data>=>{
      if(tab==='gameplay')return {gameplay:await analyticsApi.gameplay(query,signal)};
      if(tab==='heatmap')return {heatmap:await analyticsApi.heatmap(query,cell,[event],signal)};
      return {comparison:await analyticsApi.comparison(query,group,signal)};
    },
    // A filter change keeps the same tab's numbers on screen (dimmed) until the new slice arrives.
    placeholderData:(previous,previousQuery)=>previousQuery?.queryKey[1]===tab?previous:undefined,
  });
  const data=analytics.data;
  const versionOptions=state.drafts.map(d=><NativeSelectOption key={d.id} value={d.id}>#{d.version_no} · {d.label}</NativeSelectOption>);
  // Analyst has no content version catalog in the BE, so versions are entered as GUIDs.
  const versionInput=(id:string,label:string,value:string,set:(v:string)=>void,empty:string)=><Field key={id}><FieldLabel htmlFor={id}>{label}</FieldLabel>{analyst?<Input id={id} value={value} onChange={e=>set(e.target.value)} placeholder="Version GUID · empty = all"/>:<NativeSelect id={id} className="w-full" value={value} onChange={e=>set(e.target.value)}><NativeSelectOption value="">{empty}</NativeSelectOption>{versionOptions}</NativeSelect>}</Field>;
  return <div className="sv-page"><PageHeading title="Analytics" />
    <Tabs value={tab} onValueChange={value=>setTab(value as Tab)} className="overflow-x-auto">
      <TabsList variant="line">{tabs.map(([id,label])=><TabsTrigger key={id} value={id} className="flex-none">{label}</TabsTrigger>)}</TabsList>
    </Tabs>
    {tab==='solvers'?<SolverConfigurations enums={enums.data}/>:<>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <Field><FieldLabel htmlFor="an-source">Source</FieldLabel><NativeSelect id="an-source" className="w-full" value={source} onChange={e=>setSource(e.target.value as 'human'|'replay')}><NativeSelectOption value="human">Human</NativeSelectOption><NativeSelectOption value="replay">Replay</NativeSelectOption></NativeSelect></Field>
        <Field><FieldLabel htmlFor="an-from">From</FieldLabel><Input id="an-from" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></Field>
        <Field><FieldLabel htmlFor="an-to">To</FieldLabel><Input id="an-to" type="date" value={to} onChange={e=>setTo(e.target.value)}/></Field>
        {versionInput('an-version','Content version',version,setVersion,'All versions')}
        <Field><FieldLabel htmlFor="an-map">Map code</FieldLabel><Input id="an-map" value={map} onChange={e=>setMap(e.target.value)} placeholder="e.g. map_01"/></Field>
        <Field><FieldLabel htmlFor="an-family">Solver family</FieldLabel><NativeSelect id="an-family" className="w-full" value={family} onChange={e=>setFamily(e.target.value)}><NativeSelectOption value="">All families</NativeSelectOption>{enums.data?.solverFamilies.map(v=><NativeSelectOption key={v} value={v}>{v}</NativeSelectOption>)}</NativeSelect></Field>
        <Field><FieldLabel htmlFor="an-solver">Solver configuration</FieldLabel><NativeSelect id="an-solver" className="w-full" value={solver} onChange={e=>setSolver(e.target.value)}><NativeSelectOption value="">All configurations</NativeSelectOption>{solvers.data?.map(s=><NativeSelectOption value={s.id} key={s.id}>{s.name}</NativeSelectOption>)}</NativeSelect></Field>
      </div>
      {tab==='heatmap'&&<div className="grid items-start gap-4 sm:grid-cols-2 lg:max-w-3xl"><Field><FieldLabel htmlFor="an-event">Event type</FieldLabel><NativeSelect id="an-event" className="w-full" value={event} onChange={e=>setEvent(e.target.value)}><NativeSelectOption value="player_death">Player death</NativeSelectOption><NativeSelectOption value="player_spotted">Player spotted</NativeSelectOption></NativeSelect></Field><div className="sv-form"><NumericControl label="Cell size" value={cell} min={1} max={50} step={1} sliderMin={1} sliderMax={50} unit="m" onChange={v=>setCell(v!)} onError={setCellError}/></div></div>}
      {tab==='comparison'&&<Field className="max-w-xs"><FieldLabel htmlFor="an-group">Group by</FieldLabel><NativeSelect id="an-group" className="w-full" value={group} onChange={e=>setGroup(e.target.value)}><NativeSelectOption value="configuration">Configuration</NativeSelectOption><NativeSelectOption value="family">Family</NativeSelectOption></NativeSelect></Field>}
      {!validVersionIds?<Alert variant="destructive"><AlertDescription>Enter a valid version GUID. The current BE does not expose a version catalog to Analyst.</AlertDescription></Alert>
      :!validDates?<Alert variant="destructive"><AlertDescription>Choose a valid date range of at most 366 days.</AlertDescription></Alert>
      :cellError&&tab==='heatmap'?<Alert variant="destructive"><AlertDescription>{cellError}</AlertDescription></Alert>
      :needsInput?<Empty title="Enter a map code"/>
      :analytics.error?<Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-4">{errorMessage(analytics.error)}<Button variant="outline" size="sm" onClick={()=>void analytics.refetch()}>Retry</Button></AlertDescription></Alert>
      :!data?<div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground" role="status"><Spinner/>Loading analytics…</div>
      :<div className={cn('sv-page transition-opacity',analytics.isPlaceholderData&&'opacity-60')} aria-busy={analytics.isFetching}>
        {data.gameplay&&<GameplayPanels data={data.gameplay}/>}
        {data.heatmap&&<Panel title="Difficulty heatmap"><Heatmap data={data.heatmap}/></Panel>}
        {data.comparison&&<Panel title="AI comparison" description="Capture rate per solver group">
          {data.comparison.length>0&&<HorizontalBars unit="Capture rate (%)" rows={data.comparison.map(r=>({label:(new Set(data.comparison!.map(x=>x.contentVersionId)).size>1?(r.contentVersionLabel||'—')+' · ':'')+r.groupLabel,value:Number(r.captureRate||0)*100,detail:pct(r.captureRate)}))}/>}
          <MetricsTable headers={['Version','Solver group','Family','Capture rate','Escape time (s)','Coordination score']} rows={data.comparison.map(r=>[r.contentVersionLabel||r.contentVersionId||'—',r.groupLabel,r.family,pct(r.captureRate),num(r.avgEscapeSeconds),num(r.avgCoordinationScore)])}/>
        </Panel>}
      </div>}
    </>}
  </div>;
}
