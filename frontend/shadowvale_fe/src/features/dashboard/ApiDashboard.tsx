import { useTranslation } from '../preferences/preferencesContext';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../content/workspaceContext';
import { useAuth } from '../../hooks/useAuth';
import { contentApi } from '../content/contentApi';
import { errorMessage } from '../../services/api/errors';
import { resources } from '../content/apiModel';
import { collections, type ContentBundle } from '../content/types';
type ContentCounts = Record<string, number>;
import { Empty,Icon,PageHeading,Status } from '../shared/ui';
import { dateLabel } from '../shared/format';
export function ApiDashboard(){
  const t = useTranslation();
 const {state}=useWorkspace(),{user}=useAuth();
 const [counts,setCounts]=useState<ContentCounts|null>(null),[error,setError]=useState('');
 const active=state.releases.find(r=>r.id===state.activeReleaseId);
 const activeId=active?.id;
 useEffect(()=>{let live=true;if(activeId)contentApi.details(activeId).then(v=>{if(live){const b=v.bundle as ContentBundle;setCounts(Object.fromEntries(resources.map(([key])=>[key,b[key]?.length||0])));}}).catch(e=>{if(live)setError(errorMessage(e));});return()=>{live=false;};},[activeId]);
 const drafts=user?.role==='designer'?state.drafts.filter(d=>d.authorId===user.id):state.drafts;
 if(user?.role==='analyst')return <div className="sv-page"><PageHeading title={t("Overview")}/><div className="sv-alert">{t("The current BE restricts content version metadata and publication history to Admin/Designer. Use Analytics for game data.")}</div><Link className="sv-button" to="/admin/analytics">{t("Analytics")}</Link></div>;
 return <div className="sv-page"><PageHeading title={t("Overview")} description={t("Content versions and publication activity.")} action={<Link className="sv-button sv-button-primary" to={user?.role==='designer'?'/admin/content':'/admin/analytics'}>{user?.role==='designer'?t("Content authoring"):t("Analytics")}</Link>}/>
 <div className="sv-stats-grid">{[
 ['Published version',active?'#'+active.version_no:'—'],['Content resources',counts?Object.values(counts).reduce<number>((sum,v)=>sum+Number(v),0):'—'],
 ['Drafts & returned',drafts.filter(d=>['draft','rejected'].includes(d.status)).length],['In review',drafts.filter(d=>d.status==='in_review').length],
 ].map(([label,value])=><article className="sv-stat" key={label}><span>{t(String(label))}</span><strong>{value}</strong></article>)}</div>
 {error&&<div className="sv-alert sv-alert-error" role="alert">{error}</div>}
 <div className="sv-dashboard-columns"><section className="sv-panel"><div className="sv-panel-heading"><h2>{t("Recent content versions")}</h2></div><div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>{t("Version")}</th><th>{t("Label")}</th><th>{t("Status")}</th><th>{t("Updated")}</th></tr></thead><tbody>{drafts.slice(0,5).map(d=><tr key={d.id}><td>#{d.version_no}</td><td>{user?.role==='designer'?<Link to={'/admin/content/'+d.id}>{d.label}</Link>:d.label}</td><td><Status value={d.status}/></td><td>{dateLabel(d.updatedAt)}</td></tr>)}</tbody></table></div>{!drafts.length&&<Empty title={t("No content versions")}/>}</section>
 <section className="sv-panel"><div className="sv-panel-heading"><h2>{t("Publication activity")}</h2><Icon name="history"/></div><div className="sv-activity">{state.audit.slice(0,5).map(a=><div key={a.id}><span className="sv-activity-dot"/><div><strong>{a.action}</strong><p>{a.target}</p><small>{a.actor} · {dateLabel(a.at)}</small></div></div>)}</div>{!state.audit.length&&<Empty title={t("No publication history")}/>}</section></div>
 <section className="sv-panel"><div className="sv-panel-heading"><h2>{t("Published content")}</h2><Link className="sv-text-link" to="/admin/releases">{t("Versions")}</Link></div>{counts?<div className="sv-library-grid">{Object.entries(counts).map(([key,value])=><div key={key}><Icon name="inventory_2"/><strong>{value}</strong><span>{t(collections.find(c => c.key === key)?.label || key)}</span></div>)}</div>:<Empty title={t("No published content")}/>}</section></div>;
}
