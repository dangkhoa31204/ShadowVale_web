import { useTranslation } from '../preferences/preferencesContext';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { can } from '../auth/access';
import { LatencyChart } from './LatencyChart';
import './analytics.css';
import { analyticsApi, type AnalyticsFilters } from './analyticsApi';
import { SolverConfigurations } from './SolverConfigurations';
import { useWorkspace } from '../content/workspaceContext';
import { contentApi } from '../content/contentApi';
import { errorMessage } from '../../services/api/errors';
import type { EnumsDto, HeatmapDto, AiComparisonRowDto, ScalabilityRowDto, VersionComparisonDto, SolverConfigurationDto } from '../../services/api/contracts';
import { Empty, Icon, PageHeading } from '../shared/ui';
import { NumericControl } from '../shared/NumericControl';
type Overview=Awaited<ReturnType<typeof analyticsApi.overview>>;
type Data={overview?:Overview;heatmap?:HeatmapDto;comparison?:AiComparisonRowDto[];scalability?:ScalabilityRowDto[];versions?:VersionComparisonDto};
const num=(v:unknown)=>v===null||v===undefined?'—':Number(v).toLocaleString('en-GB',{maximumFractionDigits:2});
const pct=(v:unknown)=>v===null||v===undefined?'—':(Number(v)*100).toFixed(1)+'%';
function Panel({title,children}:{title:string;children:React.ReactNode}){ const t = useTranslation(); return <section className="sv-panel"><div className="sv-panel-heading"><h2>{t(title)}</h2></div>{children}</section>;}
function Bars({rows}:{rows:{name:string;value:string;share:number}[]}){
  const t = useTranslation();return rows.length?<div className="sv-bars">{rows.map(r=><div key={r.name}><div><strong>{t(r.name)}</strong><span>{r.value}</span></div><div className="sv-bar-track"><span style={{width:Math.max(0,Math.min(100,r.share*100))+'%'}}/></div></div>)}</div>:<Empty title={t("No data")}/>;}
function MetricsTable({headers,rows}:{headers:string[];rows:React.ReactNode[][]}){
  const t = useTranslation();return rows.length?<div className="sv-table-wrap"><table className="sv-table"><thead><tr>{headers.map(h=><th key={h}>{t(h)}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>:<Empty title={t("No data for these filters")}/>;}
function OverviewPanels({data}:{data:Omit<Overview,'playstyle'> & {playstyle?:Overview['playstyle']}}){
  const t = useTranslation();
  const playstyle=data.playstyle;
  return <><div className="sv-stats-grid">{[
    ['Sessions',num(data.overview.sessions)],['Players',num(data.overview.players)],['Mission completion',pct(data.funnel.completionRate)],['Average duration',num(data.overview.avgDurationSeconds)+' s'],
  ].map(([label,value])=><article className="sv-stat" key={t(String(label))}><span>{t(String(label))}</span><strong>{value}</strong></article>)}</div>
    <div className="sv-dashboard-columns"><Panel title={t("Session outcomes")}><Bars rows={data.overview.outcomes.map(r=>({name:r.outcome,value:num(r.sessions)+' · '+pct(r.share),share:Number(r.share)}))}/><p className="sv-table-note">{t("Unfinished:")} {num(data.overview.unfinishedSessions)} {t("· Median duration:")} {num(data.overview.medianDurationSeconds)} {t("s")}</p></Panel>
      <Panel title={t("Mission funnel")}><Bars rows={[{name:'Started',value:num(data.funnel.sessionsStarted),share:1},...data.funnel.objectives.map(r=>({name:t('Objective')+' '+r.objectiveIndex,value:num(r.sessions)+' · '+pct(r.shareOfStarted),share:Number(r.shareOfStarted||0)})),{name:'Completed',value:num(data.funnel.missionsCompleted)+' · '+pct(data.funnel.completionRate),share:Number(data.funnel.completionRate||0)}]}/></Panel></div>
    <Panel title={t("Weapon usage")}><MetricsTable headers={['Weapon','Shots','Kills','Kills / shot','Sessions used','Session share']} rows={data.weapons.weapons.map(r=>[r.weapon,num(r.shots),num(r.kills),num(r.killsPerShot),num(r.sessionsUsed),pct(r.sessionShare)])}/><p className="sv-table-note">{t("Exact finished-session statistics ·")} {num(data.weapons.finishedSessions)} {t("sessions")}</p></Panel>
    <div className="sv-dashboard-columns">{playstyle && <Panel title={t("Stealth and combat")}><Bars rows={playstyle.stealthRatioHistogram.map(r=>({name:pct(r.from)+'–'+pct(r.to),value:num(r.sessions)+' '+t('sessions'),share:Number(r.sessions)/Math.max(1,Number(playstyle.finishedSessions))}))}/><p className="sv-table-note">{t("Average stealth:")} {pct(playstyle.avgStealthRatio)} {t("· Average detections:")} {num(playstyle.avgTimesDetected)} {t("· Sessions without kills:")} {num(playstyle.sessionsWithoutKills)}</p></Panel>}<Panel title={t("Daily sessions")}><MetricsTable headers={['Day','Sessions']} rows={data.overview.sessionsPerDay.map(r=>[r.day,num(r.sessions)])}/></Panel></div>
  </>;
}
function Heatmap({data}:{data:HeatmapDto}){
  const t = useTranslation();
  if(!data.cells.length)return <Empty title={t("No spatial events")}/>;
  const size=Number(data.cellSize),minX=Math.min(...data.cells.map(c=>Number(c.x))),minY=Math.min(...data.cells.map(c=>Number(c.y)));
  const width=Math.max(size,Math.max(...data.cells.map(c=>Number(c.x)))-minX+size),height=Math.max(size,Math.max(...data.cells.map(c=>Number(c.y)))-minY+size);
  const max=Math.max(1,...data.cells.map(c=>Number(c.count)));
  return <div style={{padding:24}}><svg role="img" aria-label={t("Difficulty heatmap for ")+data.mapCode} viewBox={`${minX} ${minY} ${width} ${height}`} style={{width:'100%',height:360,background:'#182233'}}>{data.cells.map(c=><rect key={c.x+':'+c.y} x={Number(c.x)} y={Number(c.y)} width={size} height={size} fill={`rgba(249,149,90,${0.15+0.85*Number(c.count)/max})`}><title>{t("X")} {c.x} {t(", Z")} {c.y}: {c.count} {t("events")}</title></rect>)}</svg><p className="sv-table-note">{t("World X / Z ·")} {size} {t("m cells ·")} {data.eventTypes.join(', ')} {t("· peak")} {max}</p></div>;
}
export function ApiAnalyticsPage(){
  const t = useTranslation();
  const {state}=useWorkspace(),{user}=useAuth();
  const canExport=!!user&&can(user.role,'analyticsExport');

  const [tab,setTab]=useState('overview'),[from,setFrom]=useState(()=>new Date(Date.now()-7*86400000).toISOString().slice(0,10)),[to,setTo]=useState(()=>new Date().toISOString().slice(0,10)),[source,setSource]=useState<'human'|'replay'>('human');
  const [version,setVersion]=useState(''),[map,setMap]=useState(''),[family,setFamily]=useState(''),[solver,setSolver]=useState(''),[group,setGroup]=useState('configuration');
  const [a,setA]=useState(''),[b,setB]=useState(''),[cell,setCell]=useState(5),[cellError,setCellError]=useState(''),[event,setEvent]=useState('player_death');
  const [data,setData]=useState<Data>({}),[enums,setEnums]=useState<EnumsDto>(),[solvers,setSolvers]=useState<SolverConfigurationDto[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[exporting,setExporting]=useState(false),[dataset,setDataset]=useState('sessions'),[exportOpen,setExportOpen]=useState(false);
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
  async function csv(){setExporting(true);setError('');try{if(!validVersionIds)throw new Error('Enter a valid version GUID.');if(!canExport)throw new Error('CSV export is available to Admin and Analyst.');const blob=await analyticsApi.csv(dataset,query);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='shadowvale-'+dataset+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportOpen(false);}catch(e){if(e&&typeof e==='object'&&'response' in e){const response=(e as {response?:{data?:unknown}}).response;if(response?.data instanceof Blob){try{const p=JSON.parse(await response.data.text());setError(p.message||p.detail||'CSV export failed.');}catch{setError(errorMessage(e));}}else setError(errorMessage(e));}else setError(errorMessage(e));}finally{setExporting(false);}}
  const tabs=[['overview','Overview'],['heatmap','Heatmap'],['comparison','AI comparison'],['scalability','Scalability'],['versions','Version comparison'],['solvers','Solver configurations']];
  const needsInput=tab==='heatmap'&&!map.trim()||tab==='versions'&&(!a||!b);
  return <div className="sv-page"><PageHeading title={t("Analytics")} action={canExport&&<button className="sv-button" disabled={exporting} onClick={()=>setExportOpen(true)}><Icon name="download"/>{t("Export CSV")}</button>}/>
    <div className="sv-content-tabs" role="tablist">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'is-active':''} onClick={()=>change(()=>setTab(id))}>{t(String(label))}</button>)}</div>
    {tab==='solvers'?<SolverConfigurations enums={enums}/>:<>
      <div className="sv-analytics-filters sv-form">
        <label>{t("Source")}<select value={source} onChange={e=>change(()=>setSource(e.target.value as 'human'|'replay'))}><option value="human">{t("Human")}</option><option value="replay">{t("Replay")}</option></select></label>
        <label>{t("From")}<input type="date" value={from} onChange={e=>change(()=>setFrom(e.target.value))}/></label><label>{t("To")}<input type="date" value={to} onChange={e=>change(()=>setTo(e.target.value))}/></label>
        <label>{t("Content version")} {user?.role==='analyst'?<input value={version} onChange={e=>change(()=>setVersion(e.target.value))} placeholder={t("Version GUID · empty = all")}/>:<select value={version} onChange={e=>change(()=>setVersion(e.target.value))}><option value="">{t("All versions")}</option>{state.drafts.map(d=><option key={d.id} value={d.id}>#{d.version_no} · {d.label}</option>)}</select>}</label>
        <label>{t("Map code")}<input value={map} onChange={e=>change(()=>setMap(e.target.value))} placeholder={t("e.g. map_01")}/></label>
        <label>{t("Solver family")}<select value={family} onChange={e=>change(()=>setFamily(e.target.value))}><option value="">{t("All families")}</option>{enums?.solverFamilies.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>{t("Solver configuration")}<select value={solver} onChange={e=>change(()=>setSolver(e.target.value))}><option value="">{t("All configurations")}</option>{solvers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      </div>
      {tab==='heatmap'&&<div className="sv-analytics-filters sv-form"><label>{t("Event type")}<select value={event} onChange={e=>change(()=>setEvent(e.target.value))}><option value="player_death">{t("Player death")}</option><option value="player_spotted">{t("Player spotted")}</option></select></label><NumericControl label={t("Cell size")} value={cell} min={1} max={50} step={1} sliderMin={1} sliderMax={50} unit="m" onChange={v=>change(()=>setCell(v!))} onError={setCellError}/></div>}
      {tab==='comparison'&&<div className="sv-form"><label>{t("Group by")}<select value={group} onChange={e=>change(()=>setGroup(e.target.value))}><option value="configuration">{t("Configuration")}</option><option value="family">{t("Family")}</option></select></label></div>}
      {tab==='versions'&&<div className="sv-compare-controls sv-form">{[['From version',a,setA],['To version',b,setB]].map(([label,value,set])=><label key={t(String(label))}>{t(String(label))}{user?.role==='analyst'?<input value={String(value)} placeholder={t("Version GUID")} onChange={e=>change(()=>(set as (v:string)=>void)(e.target.value))}/>:<select value={String(value)} onChange={e=>change(()=>(set as (v:string)=>void)(e.target.value))}><option value="">{t("Choose version")}</option>{state.drafts.map(d=><option key={d.id} value={d.id}>#{d.version_no} · {d.label}</option>)}</select>}</label>)}</div>}
      {!validVersionIds?<div className="sv-alert sv-alert-error">{t("Enter a valid version GUID. The current BE does not expose a version catalog to Analyst.")}</div>:!validDates?<div className="sv-alert sv-alert-error">{t("Choose a valid date range of at most 366 days.")}</div>:cellError&&tab==='heatmap'?<div className="sv-alert sv-alert-error">{cellError}</div>:needsInput?<Empty title={tab==='heatmap'?t("Enter a map code"):t("Select two versions")}/>:error?<div className="sv-alert sv-alert-error" role="alert">{error}<button className="sv-button" onClick={()=>change(()=>setRetry(retry+1))}>{t("Retry")}</button></div>:loading?<div className="sv-empty" role="status">{t("Loading analytics…")}</div>:<>
        {data.overview&&<OverviewPanels data={data.overview}/>}
        {data.heatmap&&<Panel title={t("Difficulty heatmap")}><Heatmap data={data.heatmap}/></Panel>}
        {data.comparison&&<Panel title={t("AI comparison")}><MetricsTable headers={['Version','Solver group','Family','Sessions','Encounters','Capture rate','Escape avg (s)','Score','p95 (ms)','Within budget','Fallback']} rows={data.comparison.map(r=>[r.contentVersionLabel||r.contentVersionId||'—',r.groupLabel,r.family,num(r.sessions),num(r.encounters),pct(r.captureRate),num(r.avgEscapeSeconds),num(r.avgCoordinationScore),num(r.latencyP95Ms),pct(r.withinBudgetRate),pct(r.fallbackRate)])}/></Panel>}
        {data.scalability&&<Panel title={t("AI scalability")}><LatencyChart rows={data.scalability}/><MetricsTable headers={['Configuration','Family','Agents','Nodes','Replans','p50 (ms)','p95 (ms)','Objective','Within budget']} rows={data.scalability.map(r=>[r.code,r.family,num(r.numAgents),r.nodesFrom+'–'+r.nodesTo,num(r.replans),num(r.latencyP50Ms),num(r.latencyP95Ms),num(r.avgObjective),pct(r.withinBudgetRate)])}/></Panel>}
        {data.versions&&<div className="sv-version-comparison">{[data.versions.a,data.versions.b].map((v,index)=><div key={v.contentVersionId}><h2>{state.drafts.find(d=>d.id===v.contentVersionId)?.version_no ? t("Version #")+state.drafts.find(d=>d.id===v.contentVersionId)!.version_no : t("Version ")+(index===0?"A":"B")}</h2><p className="sv-version-guid">{v.contentVersionId}</p><OverviewPanels data={{overview:v.overview,funnel:v.funnel,weapons:v.weapons,}}/></div>)}</div>}
      </>}
      <p className="sv-table-note">{t("Skill progress has no analytics API; player progression remains in local saves. CSV events export supports at most 92 days.")}</p>
    </>}
    {exportOpen&&<div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-label={t("Export analytics CSV")} onKeyDown={e=>{if(e.key==='Escape'&&!exporting)setExportOpen(false);}}><h2>{t("Export CSV")}</h2><div className="sv-form"><label>{t("Dataset")}<select aria-label={t("CSV dataset")} value={dataset} onChange={e=>setDataset(e.target.value)}>{['sessions','events','encounters','coordination-results'].map(d=><option key={d}>{d}</option>)}</select></label><label>{t("From")}<input type="date" value={from} onChange={e=>change(()=>setFrom(e.target.value))}/></label><label>{t("To")}<input type="date" value={to} onChange={e=>change(()=>setTo(e.target.value))}/></label></div><p>{t("Uses the current source, version, map and solver filters.")}</p>{(!validDates||dataset==='events'&&end.getTime()-start.getTime()>92*86400000)&&<div className="sv-alert sv-alert-error">{t("Choose a valid range: events up to 92 days; other datasets up to 366 days.")}</div>}{error&&<p role="alert">{error}</p>}<div className="sv-row-actions"><button className="sv-button" disabled={exporting} onClick={()=>setExportOpen(false)}>{t("Cancel")}</button><button className="sv-button sv-button-primary" disabled={exporting||!validDates||!validVersionIds||dataset==='events'&&end.getTime()-start.getTime()>92*86400000} onClick={()=>void csv()}>{exporting?t("Exporting…"):t("Download CSV")}</button></div></section></div>}
  </div>;
}
