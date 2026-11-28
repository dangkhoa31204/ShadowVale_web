import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { analyticsApi, type AnalyticsFilters } from './analyticsApi';
import { SolverConfigurations } from './SolverConfigurations';
import { contentApi } from '../content/contentApi';
import { errorMessage } from '../../services/api/errors';
import type { HeatmapDto, AiComparisonRowDto } from '../../services/api/contracts';
import { Empty, Icon, PageHeading, Panel } from '../shared/ui';
import { NumericControl } from '../shared/NumericControl';
import { ComparisonPanel, GameplayPanels, MetricTiles, MetricsTable, ScalabilityTable } from './AnalyticsDashboardPanels';
import { familyNames, mapNames, num } from './analyticsPresentation';
import { SolverLatencyScatter } from './TelemetryCharts';
type Gameplay=Awaited<ReturnType<typeof analyticsApi.gameplay>>;
type Data={gameplay?:Gameplay;heatmap?:HeatmapDto;comparison?:AiComparisonRowDto[]};
function Heatmap({data}:{data:HeatmapDto}){
  if(!data.cells.length)return <Empty title="No spatial events"/>;
  const size=Number(data.cellSize),minX=Math.min(...data.cells.map(c=>Number(c.x))),minY=Math.min(...data.cells.map(c=>Number(c.y)));
  const width=Math.max(size,Math.max(...data.cells.map(c=>Number(c.x)))-minX+size),height=Math.max(size,Math.max(...data.cells.map(c=>Number(c.y)))-minY+size);
  const max=Math.max(1,...data.cells.map(c=>Number(c.count)));
  // Sequential: one hue, opacity grows with the event count.
  const hotspots = [...data.cells].sort((a, b) => Number(b.count) - Number(a.count)).slice(0, 10);
  return <div className="grid gap-3 px-6 pb-6">
    <svg role="img" aria-label={"Difficulty heatmap for "+data.mapCode} viewBox={`${minX} ${-minY-height} ${width} ${height}`} className="h-90 w-full rounded-lg bg-muted">
      {data.cells.map(c => <rect key={c.x+':'+c.y} x={c.x} y={-Number(c.y)-size} width={size} height={size} fill="var(--chart-3)" fillOpacity={0.15+0.85*Number(c.count)/max} stroke="var(--muted)" strokeWidth={size*0.06}><title>X {c.x}, Z {c.y}: {c.count} events</title></rect>)}
    </svg>
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>Low</span><span className="h-2 w-32 rounded-sm bg-linear-to-r from-chart-3/15 to-chart-3"/><span>{max} events per cell</span><span>· X increases right · Z increases up · {size} m cells</span></div>
    <details className="rounded-lg border px-4 py-3 text-sm"><summary className="cursor-pointer font-medium">Highest event counts</summary>
      <MetricsTable headers={['World X', 'World Z', 'Events']} rows={hotspots.map(cell => [num(cell.x), num(cell.y), num(cell.count)])}/>
    </details>
  </div>;
}
// The date inputs are local days; toISOString() would give the UTC day, a day behind before 07:00 in Vietnam
const localDay=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const tabs=[['gameplay','Gameplay'],['heatmap','Difficulty heatmap'],['comparison','AI comparison'],['solvers','Solver configurations']] as const;
type Tab=typeof tabs[number][0];
export function ApiAnalyticsPage(){
  const [tab,setTab]=useState<Tab>('gameplay'),[from,setFrom]=useState(()=>localDay(new Date(Date.now()-7*86400000))),[to,setTo]=useState(()=>localDay(new Date())),[source,setSource]=useState<'human'|'replay'>('human');
  const [version,setVersion]=useState(''),[map,setMap]=useState(''),[family,setFamily]=useState(''),[solver,setSolver]=useState(''),[group,setGroup]=useState('family');
  const [cell,setCell]=useState(5),[cellError,setCellError]=useState(''),[event,setEvent]=useState('player_death');
  const enums=useQuery({queryKey:['enums'],queryFn:contentApi.enums,staleTime:Infinity});
  // Published versions only: telemetry can only come from a version the game downloaded. Same list for every role.
  const versions=useQuery({queryKey:['analytics-content-versions'],queryFn:({signal})=>analyticsApi.contentVersions(signal)});
  const solvers=useQuery({queryKey:['solver-configurations'],queryFn:({signal})=>analyticsApi.solvers(signal)});
  const start=new Date(from+'T00:00:00'),end=new Date(to+'T23:59:59.999');
  const validDates=Number.isFinite(start.getTime())&&Number.isFinite(end.getTime())&&end>=start&&(end.getTime()-start.getTime())<=366*86400000;
  const query:AnalyticsFilters={source,from:validDates?start.toISOString():'',to:validDates?end.toISOString():'',...(version?{contentVersionId:version}:{}),...(map.trim()?{mapCode:map.trim()}:{}),...(family?{family}:{}),...(solver?{solverConfigurationId:solver}:{})};
  const needsInput=tab==='heatmap'&&!map.trim();
  const extra=tab==='heatmap'?{cell,event}:tab==='comparison'?{group}:{};
  const analytics=useQuery({
    queryKey:['analytics',tab,query,extra],
    enabled:tab!=='solvers'&&validDates&&!needsInput&&!(tab==='heatmap'&&cellError),
    queryFn:async({signal}):Promise<Data>=>{
      if(tab==='gameplay')return {gameplay:await analyticsApi.gameplay(query,signal)};
      if(tab==='heatmap')return {heatmap:await analyticsApi.heatmap(query,cell,[event],signal)};
      return {comparison:await analyticsApi.comparison(query,group,signal)};
    },
    // A filter change keeps the same tab's numbers on screen (dimmed) until the new slice arrives.
    placeholderData:(previous,previousQuery)=>previousQuery?.queryKey[1]===tab?previous:undefined,
  });
  const [showScalability, setShowScalability] = useState(false);
  const scalability = useQuery({
    queryKey: ['analytics', 'scalability', query],
    enabled: tab === 'comparison' && validDates && showScalability,
    queryFn: ({ signal }) => analyticsApi.scalability(query, signal),
  });
  const data=analytics.data;
  return <div className="sv-page"><PageHeading title="Telemetry analytics" description="Gameplay progression, difficulty and enemy AI performance." action={<Button variant="outline" disabled={analytics.isFetching || versions.isFetching} onClick={() => { void versions.refetch(); void solvers.refetch(); if (tab !== 'solvers' && validDates && !needsInput && !(tab === 'heatmap' && cellError)) void analytics.refetch(); }}>Refresh</Button>} />
    <Tabs value={tab} onValueChange={value=>setTab(value as Tab)} className="overflow-x-auto">
      <TabsList variant="line" aria-label="Analytics views">{tabs.map(([id,label])=><TabsTrigger key={id} value={id} className="flex-none">{label}</TabsTrigger>)}</TabsList>
    </Tabs>
    {tab==='solvers'?<SolverConfigurations enums={enums.data}/>:<>
      <section className="grid gap-4 rounded-xl border bg-card p-4" aria-label="Analytics filters">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Icon name="list_alt" /> Filters</h2>
          <span role="status" className="text-xs text-muted-foreground">{analytics.isFetching ? 'Updating analytics…' : analytics.dataUpdatedAt ? 'Updated ' + new Date(analytics.dataUpdatedAt).toLocaleString() : ''}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Field><FieldLabel htmlFor="an-source">Source</FieldLabel><NativeSelect id="an-source" aria-describedby="an-source-description" className="w-full" value={source} onChange={e=>setSource(e.target.value as 'human'|'replay')}><NativeSelectOption value="human">Human gameplay</NativeSelectOption><NativeSelectOption value="replay">Automated replay</NativeSelectOption></NativeSelect><p id="an-source-description" className="text-xs text-muted-foreground">Human gameplay includes playtests in Unity Editor.</p></Field>
        <Field><FieldLabel htmlFor="an-from">From</FieldLabel><Input id="an-from" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></Field>
        <Field><FieldLabel htmlFor="an-to">To</FieldLabel><Input id="an-to" type="date" value={to} onChange={e=>setTo(e.target.value)}/></Field>
        <Field><FieldLabel htmlFor="an-version">Content version</FieldLabel><NativeSelect id="an-version" className="w-full" value={version} onChange={e=>setVersion(e.target.value)}><NativeSelectOption value="">All versions</NativeSelectOption>{versions.data?.map(v=><NativeSelectOption key={v.id} value={v.id}>#{v.versionNo} · {v.label}{v.isLive?' (live)':''}</NativeSelectOption>)}</NativeSelect></Field>
        <Field><FieldLabel htmlFor="an-map">Map code</FieldLabel><Input id="an-map" value={map} onChange={e=>setMap(e.target.value)} list="analytics-map-codes" placeholder="All maps"/><datalist id="analytics-map-codes">{Object.entries(mapNames).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</datalist></Field>
        </div>
        <details className="border-t pt-3">
          <summary className="cursor-pointer text-sm font-medium">Solver filters</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field><FieldLabel htmlFor="an-family">Solver family</FieldLabel><NativeSelect id="an-family" className="w-full" value={family} onChange={e=>setFamily(e.target.value)}><NativeSelectOption value="">All families</NativeSelectOption>{enums.data?.solverFamilies.map(v=><NativeSelectOption key={v} value={v}>{familyNames[v] ?? v}</NativeSelectOption>)}</NativeSelect></Field>
        <Field><FieldLabel htmlFor="an-solver">Solver configuration</FieldLabel><NativeSelect id="an-solver" className="w-full" value={solver} onChange={e=>setSolver(e.target.value)}><NativeSelectOption value="">All configurations</NativeSelectOption>{solvers.data?.map(s=><NativeSelectOption value={s.id} key={s.id}>{s.name}</NativeSelectOption>)}</NativeSelect></Field>
          </div>
        </details>
      </section>
      {tab==='heatmap'&&<div className="grid items-start gap-4 sm:grid-cols-2 lg:max-w-3xl"><Field><FieldLabel htmlFor="an-event">Event type</FieldLabel><NativeSelect id="an-event" className="w-full" value={event} onChange={e=>setEvent(e.target.value)}><NativeSelectOption value="player_death">Player death</NativeSelectOption><NativeSelectOption value="player_spotted">Player spotted</NativeSelectOption></NativeSelect></Field><div className="sv-form"><NumericControl label="Cell size" value={cell} min={1} max={50} step={1} sliderMin={1} sliderMax={50} unit="m" onChange={v=>setCell(v!)} onError={setCellError}/></div></div>}
      {tab==='comparison'&&<Field className="max-w-xs"><FieldLabel htmlFor="an-group">Group by</FieldLabel><NativeSelect id="an-group" className="w-full" value={group} onChange={e=>setGroup(e.target.value)}><NativeSelectOption value="configuration">Configuration</NativeSelectOption><NativeSelectOption value="family">Family</NativeSelectOption></NativeSelect></Field>}
      {!validDates?<Alert variant="destructive"><AlertDescription>Choose a valid date range of at most 366 days.</AlertDescription></Alert>
      :cellError&&tab==='heatmap'?<Alert variant="destructive"><AlertDescription>{cellError}</AlertDescription></Alert>
      :needsInput?<Empty title="Choose a map to view its heatmap" />
      :analytics.error?<Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-4">{errorMessage(analytics.error)}<Button variant="outline" size="sm" onClick={()=>void analytics.refetch()}>Retry</Button></AlertDescription></Alert>
      :!data?<div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground" role="status"><Spinner/>Loading analytics…</div>
      :<div className={cn('sv-page transition-opacity',analytics.isPlaceholderData&&'opacity-60')} aria-busy={analytics.isFetching}>
        {data.gameplay&&<GameplayPanels data={data.gameplay} map={map.trim()}/>}
        {data.heatmap&&<>
          <MetricTiles items={[
            { label: 'Map', value: mapNames[data.heatmap.mapCode] ?? data.heatmap.mapCode, note: data.heatmap.mapCode },
            { label: 'Events', value: num(data.heatmap.cells.reduce((sum, cell) => sum + Number(cell.count), 0)), note: data.heatmap.eventTypes.includes('player_death') ? 'Player deaths' : 'Player spotted events' },
            { label: 'Active cells', value: num(data.heatmap.cells.length), note: data.heatmap.cellSize + ' m grid' },
          ]} />
          <Panel title="Difficulty heatmap" description="Event density by world position. Darker cells contain fewer events."><Heatmap data={data.heatmap}/></Panel>
        </>}
        {data.comparison&&<>
          <ComparisonPanel rows={data.comparison} />
          <details className="rounded-xl border bg-card px-5 py-4" onToggle={event => setShowScalability(event.currentTarget.open)}>
            <summary className="cursor-pointer text-sm font-semibold">Solver latency by problem size</summary>
            <p className="py-3 text-sm text-muted-foreground">Replan latency by agent count and graph size, using the same filters.</p>
            {scalability.isFetching && <p role="status" className="text-sm">Loading scalability metrics…</p>}
            {scalability.error && <Alert variant="destructive"><AlertDescription>{errorMessage(scalability.error)} <Button variant="outline" size="sm" onClick={() => void scalability.refetch()}>Retry</Button></AlertDescription></Alert>}
            {scalability.data && <>
              <SolverLatencyScatter rows={scalability.data} />
              {!!scalability.data.length && <details className="border-t pt-3 text-sm">
                <summary className="cursor-pointer font-medium">Latency and sample sizes</summary>
                <ScalabilityTable rows={scalability.data} />
              </details>}
            </>}
          </details>
        </>}
      </div>}
    </>}
  </div>;
}
