import { useTranslation } from '../preferences/preferencesContext';
import type { ScalabilityRowDto } from '../../services/api/contracts';
import { Empty } from '../shared/ui';
const colors = ['#768cff','#ff9b68','#42d8a6','#d391ee','#f3cd69','#68ccef'];
export function LatencyChart({rows}:{rows:ScalabilityRowDto[]}) {
  const t = useTranslation();
  const groups=new Map<string,ScalabilityRowDto[]>();
  for(const row of rows) if(row.latencyP95Ms!==null&&row.latencyP95Ms!==undefined) {
    const key=row.code+' · '+row.nodesFrom+'–'+row.nodesTo+' nodes';
    groups.set(key,[...(groups.get(key)||[]),row]);
  }
  const points=[...groups.values()].flat();
  if(!points.length)return <Empty title={t("No latency samples")}/>;
  const maxX=Math.max(1,...points.map(r=>Number(r.numAgents))),maxY=Math.max(1,...points.map(r=>Number(r.latencyP95Ms)));
  const x=(agents:number)=>60+agents/maxX*700, y=(ms:number)=>285-ms/maxY*235;
  return <div style={{padding:20}}><svg role="img" aria-label={t("p95 solver latency by number of agents")} viewBox="0 0 820 340" style={{width:'100%',maxHeight:380}}>
    {[0,0.25,0.5,0.75,1].map(t=><g key={t}><line x1="60" x2="760" y1={y(t*maxY)} y2={y(t*maxY)} stroke="#334155"/><text x="50" y={y(t*maxY)+5} textAnchor="end" fill="#a7b6ce" fontSize="12">{(t*maxY).toFixed(1)}</text><text x={x(t*maxX)} y="307" textAnchor="middle" fill="#a7b6ce" fontSize="12">{Math.round(t*maxX)}</text></g>)}
    <text x="60" y="24" fill="#a7b6ce" fontSize="13">{t("p95 latency (ms)")}</text><text x="410" y="335" textAnchor="middle" fill="#a7b6ce" fontSize="13">{t("Number of agents")}</text>
    {[...groups].map(([key,values],i)=><g key={key}><polyline fill="none" stroke={colors[i%colors.length]} strokeWidth="2" points={[...values].sort((a,b)=>Number(a.numAgents)-Number(b.numAgents)).map(r=>x(Number(r.numAgents))+','+y(Number(r.latencyP95Ms))).join(' ')}/>{values.map((r,j)=><circle key={j} cx={x(Number(r.numAgents))} cy={y(Number(r.latencyP95Ms))} r="4" fill={colors[i%colors.length]}><title>{key}: {r.numAgents} {t("agents ·")} {r.latencyP95Ms} {t("ms p95 ·")} {r.replans} {t("replans")}</title></circle>)}</g>)}
  </svg><div className="sv-row-actions" style={{flexWrap:'wrap'}}>{[...groups.keys()].map((key,i)=><span key={key} style={{color:colors[i%colors.length]}}>{key}</span>)}</div><p className="sv-table-note">{t("Each point is one BE aggregate bin. Node ranges remain separate series.")}</p></div>;
}
