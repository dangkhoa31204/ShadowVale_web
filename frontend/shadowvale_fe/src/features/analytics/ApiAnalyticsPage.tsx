import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LatencyChart } from './LatencyChart';
import './analytics.css';
import { analyticsApi, type AnalyticsFilters } from './analyticsApi';
import { SolverConfigurations } from './SolverConfigurations';
import { useWorkspace } from '../content/workspaceContext';
import { contentApi } from '../content/contentApi';
import { errorMessage } from '../../services/api/errors';
import type { EnumsDto, HeatmapDto, AiComparisonRowDto, ScalabilityRowDto, VersionComparisonDto, SolverConfigurationDto } from '../../services/api/contracts';
import { Empty, PageHeading } from '../shared/ui';
import { NumericControl } from '../shared/NumericControl';
type Overview=Awaited<ReturnType<typeof analyticsApi.overview>>;
type Data={overview?:Overview;heatmap?:HeatmapDto;comparison?:AiComparisonRowDto[];scalability?:ScalabilityRowDto[];versions?:VersionComparisonDto};
const num=(v:unknown)=>v===null||v===undefined?'—':Number(v).toLocaleString('en-GB',{maximumFractionDigits:2});
const pct=(v:unknown)=>v===null||v===undefined?'—':(Number(v)*100).toFixed(1)+'%';
function Panel({title,children}:{title:string;children:React.ReactNode}){ return <section className="sv-panel"><div className="sv-panel-heading"><h2>{title}</h2></div>{children}</section>;}
function Bars({rows}:{rows:{name:string;value:string;share:number}[]}){
 return rows.length?<div className="sv-bars">{rows.map(r=><div key={r.name}><div><strong>{r.name}</strong><span>{r.value}</span></div><div className="sv-bar-track"><span style={{width:Math.max(0,Math.min(100,r.share*100))+'%'}}/></div></div>)}</div>:<Empty title="No data"/>;}
function MetricsTable({headers,rows}:{headers:string[];rows:React.ReactNode[][]}){
 return rows.length?<div className="sv-table-wrap"><table className="sv-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>:<Empty title="No data for these filters"/>;}
function OverviewPanels({data}:{data:Omit<Overview,'playstyle'> & {playstyle?:Overview['playstyle']}}){
  const playstyle=data.playstyle;
  return <><div className="sv-stats-grid">{[
    ['Sessions',num(data.overview.sessions)],['Players',num(data.overview.players)],['Mission completion',pct(data.funnel.completionRate)],['Average duration',num(data.overview.avgDurationSeconds)+' s'],
  ].map(([label,value])=><article className="sv-stat" key={(String(label))}><span>{(String(label))}</span><strong>{value}</strong></article>)}</div>
    <div className="sv-dashboard-columns"><Panel title="Session outcomes"><Bars rows={data.overview.outcomes.map(r=>({name:r.outcome,value:num(r.sessions)+' · '+pct(r.share),share:Number(r.share)}))}/><p className="sv-table-note">Unfinished: {num(data.overview.unfinishedSessions)} {"· Median duration:"} {num(data.overview.medianDurationSeconds)} s</p></Panel>
      <Panel title="Mission funnel"><Bars rows={[{name:'Started',value:num(data.funnel.sessionsStarted),share:1},...data.funnel.objectives.map(r=>({name:'Objective'+' '+r.objectiveIndex,value:num(r.sessions)+' · '+pct(r.shareOfStarted),share:Number(r.shareOfStarted||0)})),{name:'Completed',value:num(data.funnel.missionsCompleted)+' · '+pct(data.funnel.completionRate),share:Number(data.funnel.completionRate||0)}]}/></Panel></div>
    <Panel title="Weapon usage"><MetricsTable headers={['Weapon','Shots','Kills','Kills / shot','Sessions used','Session share']} rows={data.weapons.weapons.map(r=>[r.weapon,num(r.shots),num(r.kills),num(r.killsPerShot),num(r.sessionsUsed),pct(r.sessionShare)])}/><p className="sv-table-note">Exact finished-session statistics · {num(data.weapons.finishedSessions)} sessions</p></Panel>
    <div className="sv-dashboard-columns">{playstyle && <Panel title="Stealth and combat"><Bars rows={playstyle.stealthRatioHistogram.map(r=>({name:pct(r.from)+'–'+pct(r.to),value:num(r.sessions)+' '+'sessions',share:Number(r.sessions)/Math.max(1,Number(playstyle.finishedSessions))}))}/><p className="sv-table-note">Average stealth: {pct(playstyle.avgStealthRatio)} {"· Average detections:"} {num(playstyle.avgTimesDetected)} {"· Sessions without kills:"} {num(playstyle.sessionsWithoutKills)}</p></Panel>}<Panel title="Daily sessions"><MetricsTable headers={['Day','Sessions']} rows={data.overview.sessionsPerDay.map(r=>[r.day,num(r.sessions)])}/></Panel></div>
  </>;
}
function Heatmap({data}:{data:HeatmapDto}){
  if(!data.cells.length)return <Empty title="No spatial events"/>;
  const size=Number(data.cellSize),minX=Math.min(...data.cells.map(c=>Number(c.x))),minY=Math.min(...data.cells.map(c=>Number(c.y)));
  const width=Math.max(size,Math.max(...data.cells.map(c=>Number(c.x)))-minX+size),height=Math.max(size,Math.max(...data.cells.map(c=>Number(c.y)))-minY+size);
  const max=Math.max(1,...data.cells.map(c=>Number(c.count)));
  return <div style={{padding:24}}><svg role="img" aria-label={"Difficulty heatmap for "+data.mapCode} viewBox={`${minX} ${minY} ${width} ${height}`} style={{width:'100%',height:360,background:'#182233'}}>{data.cells.map(c=><rect key={c.x+':'+c.y} x={Number(c.x)} y={Number(c.y)} width={size} height={size} fill={`rgba(249,149,90,${0.15+0.85*Number(c.count)/max})`}><title>X {c.x} {", Z"} {c.y}: {c.count} events</title></rect>)}</svg><p className="sv-table-note">World X / Z · {size} {"m cells ·"} {data.eventTypes.join(', ')} {"· peak"} {max}</p></div>;
}
export function ApiAnalyticsPage(){
  const {state}=useWorkspace(),{user}=useAuth();

  const [tab,setTab]=useState('overview'),[from,setFrom]=useState(()=>new Date(Date.now()-7*86400000).toISOString().slice(0,10)),[to,setTo]=useState(()=>new Date().toISOString().slice(0,10)),[source,setSource]=useState<'human'|'replay'>('human');
  const [version,setVersion]=useState(''),[map,setMap]=useState(''),[family,setFamily]=useState(''),[solver,setSolver]=useState(''),[group,setGroup]=useState('configuration');
  const [a,setA]=useState(''),[b,setB]=useState(''),[cell,setCell]=useState(5),[cellError,setCellError]=useState(''),[event,setEvent]=useState('player_death');
  const [data,setData]=useState<Data>({}),[enums,setEnums]=useState<EnumsDto>(),[solvers,setSolvers]=useState<SolverConfigurationDto[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;Promise.all([contentApi.enums(),analyticsApi.solvers()]).then(([e,s])=>{if(active){setEnums(e);setSolvers(s);}}).catch(e=>{if(active)setError(errorMessage(e));});return()=>{active=false;};},[]);
  const start=new Date(from+'T00:00:00'),end=new Date(to+'T23:59:59.999');
  const validVersionIds=[version,a,b].every(id=>!id||/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  const validDates=Number.isFinite(start.getTime())&&Number.isFinite(end.getTime())&&end>=start&&(end.getTime()-start.getTime())<=366*86400000;
  const query:AnalyticsFilters={source,from:validDates?start.toISOString():'',to:validDates?end.toISOString():'',...(version?{contentVersionId:version}:{}),...(map.trim()?{mapCode:map.trim()}:{}),...(family?{family}:{}),...(solver?{solverConfigurationId:solver}:{})};
  const queryKey=JSON.stringify(query);
  useEffect(()=>{
    const controller=new AbortController();
    if(tab==='solvers')return;
    if(!validDates||!validVersionIds)return;
    if((tab==='heatmap'&&(!map.trim()||cellError))||(tab==='versions'&&(!a||!b)))return;
    const q=JSON.parse(queryKey) as AnalyticsFilters;
    const load=async():Promise<Data>=>{
      if(tab==='overview')return {overview:await analyticsApi.overview(q,controller.signal)};
      if(tab==='heatmap')return {heatmap:await analyticsApi.heatmap(q,cell,[event],controller.signal)};
      if(tab==='comparison'){const [comparison,scalability]=await Promise.all([analyticsApi.comparison(q,group,controller.signal),analyticsApi.scalability(q,controller.signal)]);return {comparison,scalability};}
      if(tab==='scalability')return {scalability:await analyticsApi.scalability(q,controller.signal)};
      return {versions:await analyticsApi.versions(q,a,b,controller.signal)};
    };
    load().then(d=>{if(!controller.signal.aborted){setData(d);setError('');setLoading(false);}}).catch(e=>{if(!controller.signal.aborted){setError(errorMessage(e));setLoading(false);}});
    return ()=>controller.abort();
  },[tab,queryKey,validDates,validVersionIds,map,cellError,cell,event,group,a,b,retry]);
  function change(job:()=>void){setLoading(true);setData({});setError('');job();}
  const tabs=[['overview','Overview'],['heatmap','Heatmap'],['comparison','AI comparison'],['scalability','Scalability'],['versions','Version comparison'],['solvers','Solver configurations']];
  const needsInput=tab==='heatmap'&&!map.trim()||tab==='versions'&&(!a||!b);
  return <div className="sv-page"><PageHeading title="Analytics" />
    <div className="sv-content-tabs" role="tablist">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'is-active':''} onClick={()=>change(()=>setTab(id))}>{(String(label))}</button>)}</div>
    {tab==='solvers'?<SolverConfigurations enums={enums}/>:<>
      <div className="sv-analytics-filters sv-form">
        <label>Source<select value={source} onChange={e=>change(()=>setSource(e.target.value as 'human'|'replay'))}><option value="human">Human</option><option value="replay">Replay</option></select></label>
        <label>From<input type="date" value={from} onChange={e=>change(()=>setFrom(e.target.value))}/></label><label>To<input type="date" value={to} onChange={e=>change(()=>setTo(e.target.value))}/></label>
        <label>Content version {user?.role==='analyst'?<input value={version} onChange={e=>change(()=>setVersion(e.target.value))} placeholder="Version GUID · empty = all"/>:<select value={version} onChange={e=>change(()=>setVersion(e.target.value))}><option value="">All versions</option>{state.drafts.map(d=><option key={d.id} value={d.id}>#{d.version_no} · {d.label}</option>)}</select>}</label>
        <label>Map code<input value={map} onChange={e=>change(()=>setMap(e.target.value))} placeholder="e.g. map_01"/></label>
        <label>Solver family<select value={family} onChange={e=>change(()=>setFamily(e.target.value))}><option value="">All families</option>{enums?.solverFamilies.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Solver configuration<select value={solver} onChange={e=>change(()=>setSolver(e.target.value))}><option value="">All configurations</option>{solvers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      </div>
      {tab==='heatmap'&&<div className="sv-analytics-filters sv-form"><label>Event type<select value={event} onChange={e=>change(()=>setEvent(e.target.value))}><option value="player_death">Player death</option><option value="player_spotted">Player spotted</option></select></label><NumericControl label="Cell size" value={cell} min={1} max={50} step={1} sliderMin={1} sliderMax={50} unit="m" onChange={v=>change(()=>setCell(v!))} onError={setCellError}/></div>}
      {tab==='comparison'&&<div className="sv-form"><label>Group by<select value={group} onChange={e=>change(()=>setGroup(e.target.value))}><option value="configuration">Configuration</option><option value="family">Family</option></select></label></div>}
      {tab==='versions'&&<div className="sv-compare-controls sv-form">{[['From version',a,setA],['To version',b,setB]].map(([label,value,set])=><label key={(String(label))}>{(String(label))}{user?.role==='analyst'?<input value={String(value)} placeholder="Version GUID" onChange={e=>change(()=>(set as (v:string)=>void)(e.target.value))}/>:<select value={String(value)} onChange={e=>change(()=>(set as (v:string)=>void)(e.target.value))}><option value="">Choose version</option>{state.drafts.map(d=><option key={d.id} value={d.id}>#{d.version_no} · {d.label}</option>)}</select>}</label>)}</div>}
      {!validVersionIds?<div className="sv-alert sv-alert-error">Enter a valid version GUID. The current BE does not expose a version catalog to Analyst.</div>:!validDates?<div className="sv-alert sv-alert-error">Choose a valid date range of at most 366 days.</div>:cellError&&tab==='heatmap'?<div className="sv-alert sv-alert-error">{cellError}</div>:needsInput?<Empty title={tab==='heatmap'?"Enter a map code":"Select two versions"}/>:error?<div className="sv-alert sv-alert-error" role="alert">{error}<button className="sv-button" onClick={()=>change(()=>setRetry(retry+1))}>Retry</button></div>:loading?<div className="sv-empty" role="status">Loading analytics…</div>:<>
        {data.overview&&<OverviewPanels data={data.overview}/>}
        {data.heatmap&&<Panel title="Difficulty heatmap"><Heatmap data={data.heatmap}/></Panel>}
        {data.comparison&&<Panel title="AI comparison"><MetricsTable headers={['Version','Solver group','Family','Sessions','Encounters','Capture rate','Escape avg (s)','Score','p95 (ms)','Within budget','Fallback']} rows={data.comparison.map(r=>[r.contentVersionLabel||r.contentVersionId||'—',r.groupLabel,r.family,num(r.sessions),num(r.encounters),pct(r.captureRate),num(r.avgEscapeSeconds),num(r.avgCoordinationScore),num(r.latencyP95Ms),pct(r.withinBudgetRate),pct(r.fallbackRate)])}/></Panel>}
        {data.scalability&&<Panel title="AI scalability"><LatencyChart rows={data.scalability}/><MetricsTable headers={['Configuration','Family','Agents','Nodes','Replans','p50 (ms)','p95 (ms)','Objective','Within budget']} rows={data.scalability.map(r=>[r.code,r.family,num(r.numAgents),r.nodesFrom+'–'+r.nodesTo,num(r.replans),num(r.latencyP50Ms),num(r.latencyP95Ms),num(r.avgObjective),pct(r.withinBudgetRate)])}/></Panel>}
        {data.versions&&<div className="sv-version-comparison">{[data.versions.a,data.versions.b].map((v,index)=><div key={v.contentVersionId}><h2>{state.drafts.find(d=>d.id===v.contentVersionId)?.version_no ? "Version #"+state.drafts.find(d=>d.id===v.contentVersionId)!.version_no : "Version "+(index===0?"A":"B")}</h2><p className="sv-version-guid">{v.contentVersionId}</p><OverviewPanels data={{overview:v.overview,funnel:v.funnel,weapons:v.weapons,}}/></div>)}</div>}
      </>}
    </>}
  </div>;
}
