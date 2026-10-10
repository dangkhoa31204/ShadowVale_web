import { useTranslation } from '../preferences/preferencesContext';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../content/workspaceContext';
import { dateLabel } from '../shared/format';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';

export function AdminDashboard() {
  const t = useTranslation();
  const { state, reload, busy } = useWorkspace();
  const pending = state.drafts.filter(d => d.status === 'in_review').sort((a,b) => (a.submitted_at || a.updatedAt).localeCompare(b.submitted_at || b.updatedAt));
  const approved = state.drafts.filter(d => d.status === 'approved');
  const rejected = state.drafts.filter(d => d.status === 'rejected');
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  return <div className="sv-page sv-admin-page">
    <PageHeading eyebrow={t("CONTENT OPERATIONS")} title={t("Dashboard")} description={t("Review submissions and manage game content releases.")} action={<button className="sv-button" disabled={busy} onClick={() => void reload()}><Icon name="sync"/>{t("Refresh")}</button>}/>
    <div className="sv-admin-stats">
      {[{label:'Awaiting review',value:pending.length,detail:'Needs your decision',icon:'fact_check',path:'/admin/reviews'},
        {label:'Ready to publish',value:approved.length,detail:'Approved content',icon:'deployed_code',path:'/admin/releases'},
        {label:'Returned to designer',value:rejected.length,detail:'Awaiting revisions',icon:'undo',path:'/admin/reviews?status=rejected'},
        {label:'Live version',value:active?'#'+active.version_no:'—',detail:active?.label || 'No published version',icon:'public',path:'/admin/releases'}].map(s => <Link className="sv-panel sv-admin-stat" key={s.label} to={s.path}><div><span>{t(s.label)}</span><Icon name={s.icon}/></div><strong>{s.value}</strong><small>{t(s.detail)}</small></Link>)}
    </div>
    <div className="sv-admin-workflow" aria-label={t("Publication workflow")}><span><b>1</b>{t("Review content")}</span><Icon name="arrow_forward"/><span><b>2</b>{t("Approve or return")}</span><Icon name="arrow_forward"/><span><b>3</b>{t("Publish version")}</span></div>
    <div className="sv-admin-dashboard-grid">
      <section className="sv-panel"><div className="sv-panel-heading"><div><h2>{t("Awaiting your review")}</h2><p>{t("Oldest submissions first")}</p></div><Link className="sv-text-link" to="/admin/reviews">{t("View queue")}<Icon name="arrow_forward"/></Link></div>
        {pending.slice(0,5).map(d => <div className="sv-admin-task" key={d.id}><span className="sv-admin-version">#{d.version_no}</span><div><strong>{d.label}</strong><small>{d.authorName} · {dateLabel(d.submitted_at || d.updatedAt)}</small></div><Link className="sv-button sv-button-small" to={'/admin/reviews?draft='+d.id}>{t("Review")}<Icon name="arrow_forward"/></Link></div>)}
        {!pending.length && <Empty title={t("You're up to date")} description={t("New submissions from designers will appear here.")}/>}
      </section>
      <section className="sv-panel"><div className="sv-panel-heading"><div><h2>{t("Ready for release")}</h2><p>{t("Approved and waiting to publish")}</p></div><span className="sv-count">{approved.length}</span></div>
        {approved.slice(0,4).map(d => <div className="sv-admin-task" key={d.id}><div><strong>#{d.version_no} · {d.label}</strong><small>{t("Reviewed")} {dateLabel(d.reviewedAt || d.updatedAt)}</small></div><Link className="sv-button sv-button-small" to="/admin/releases">{t("Open")}<Icon name="arrow_forward"/></Link></div>)}
        {!approved.length && <Empty title={t("No releases waiting")} description={t("Approved submissions appear here before publication.")}/>}
      </section>
    </div>
    <div className="sv-admin-dashboard-grid">
      <section className="sv-panel"><div className="sv-panel-heading"><h2>{t("Live content")}</h2><Status value={active?'published':'inactive'}/></div><div className="sv-admin-live">{active?<><span className="sv-eyebrow">{t("CURRENT GAME VERSION")}</span><h2>#{active.version_no} · {active.label}</h2><p>{active.changelog || 'Published content bundle'}</p><small>{t("Published")} {dateLabel(active.publishedAt)} · {active.publishedBy}</small><Link className="sv-button" to="/admin/releases">{t("Manage versions")}<Icon name="arrow_forward"/></Link></>:<Empty title={t("No live version")} description={t("Publish an approved bundle to make it available to the game.")}/>}</div></section>
      <section className="sv-panel"><div className="sv-panel-heading"><h2>{t("Publication activity")}</h2><Icon name="history"/></div><div className="sv-activity">{state.audit.slice(0,5).map(a => <div key={a.id}><span className="sv-activity-dot"/><div><strong>{a.action}</strong><p>{a.target}</p><small>{a.actor} · {dateLabel(a.at)}</small></div></div>)}</div>{!state.audit.length&&<Empty title={t("No publication activity")}/>}</section>
    </div>
  </div>;
}
