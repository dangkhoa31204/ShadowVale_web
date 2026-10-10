import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../content/workspaceContext';
import { can } from '../auth/access';
import { collections } from '../content/types';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { actionLabels, dateLabel } from '../shared/format';
export function InternalDashboardPage() {
  const { user } = useAuth(), { state } = useWorkspace();
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  const drafts = user?.role === 'designer' ? state.drafts.filter(d => d.authorId === user.id) : state.drafts;
  const pending = drafts.filter(d => d.status === 'in_review').length;
  const entities = active ? collections.reduce((n, c) => n + active.bundle[c.key].length, 0) : 0;
  return <div className="sv-page">
    <PageHeading eyebrow={user?.role === 'analyst' ? 'ANALYST' : 'DESIGNER'} title="Overview" description="Content versions and recent activity." action={user && can(user.role, 'author') && <Link className="sv-button sv-button-primary" to="/admin/content"><Icon name="edit_note" />Content versions</Link>} />
    <div className="sv-stats-grid">
      {[{ icon: 'inventory_2', label: 'Published records', value: entities, detail: collections.length + ' content tables' }, { icon: 'edit_note', label: 'Drafts & returned', value: drafts.filter(d => ['draft', 'rejected'].includes(d.status)).length, detail: 'Draft or rejected' }, { icon: 'fact_check', label: 'In review', value: pending, detail: 'Waiting for approval' }, { icon: 'deployed_code', label: 'Published version', value: active ? '#' + active.version_no : '—', detail: active ? active.label : 'No published bundle' }].map(s => <article className="sv-stat" key={s.label}><div><span>{s.label}</span><Icon name={s.icon} /></div><strong>{s.value}</strong><small>{s.detail}</small></article>)}
    </div>
    <div className="sv-dashboard-columns"><section className="sv-panel"><div className="sv-panel-heading"><div><h2>Recent content versions</h2></div>{user && can(user.role, 'author') && <Link to="/admin/content" className="sv-text-link">View all<Icon name="arrow_forward" /></Link>}</div>
      {drafts.length ? <div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>Label</th><th>Status</th><th>Version no.</th><th /></tr></thead><tbody>{drafts.slice(0, 5).map(d => <tr key={d.id}><td><strong>{d.label}</strong><small>{d.authorName} · {dateLabel(d.updatedAt)}</small></td><td><Status value={d.status} /></td><td className="sv-mono">#{d.version_no}</td><td>{user && can(user.role, 'author') && <Link className="sv-table-link" aria-label={'Open ' + d.label} to={'/admin/content/' + d.id}><Icon name="arrow_outward" /></Link>}</td></tr>)}</tbody></table></div> : <Empty title="No content versions" description="Create a draft from a published version." />}
    </section><section className="sv-panel"><div className="sv-panel-heading"><div><h2>Recent activity</h2></div><Icon name="history" /></div><div className="sv-activity">{state.audit.slice(0, 5).map(a => <div key={a.id}><span className="sv-activity-dot" /><div><strong>{actionLabels[a.action] || a.action}</strong><p>{a.target}</p><small>{a.actor} · {dateLabel(a.at)}</small></div></div>)}</div></section></div>
    <section className="sv-panel"><div className="sv-panel-heading"><div><h2>Published content</h2><p>{active ? '#' + active.version_no + ' · Published ' + dateLabel(active.publishedAt) : 'No published version'}</p></div><Link to="/admin/releases" className="sv-text-link">Publication history<Icon name="arrow_forward" /></Link></div><div className="sv-library-grid">{collections.map(c => <div key={c.key}><Icon name={c.icon} /><strong>{active?.bundle[c.key].length || 0}</strong><span>{c.label}</span></div>)}</div></section>
  </div>;
}
