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
    <PageHeading eyebrow="YOUR CONTENT WORKSPACE" title={'Welcome back, ' + (user?.callsign.split(' ')[0] || 'team')} description="Take your next balance pass from an idea to a versioned game release." action={user && can(user.role, 'author') && <Link className="sv-button sv-button-primary" to="/admin/content"><Icon name="add" />Open content authoring</Link>} />
    <div className="sv-stats-grid">
      {[{ icon: 'inventory_2', label: 'Published entities', value: entities, detail: 'Across ' + collections.length + ' content types' }, { icon: 'edit_note', label: 'Working drafts', value: drafts.filter(d => ['draft', 'changes_requested'].includes(d.status)).length, detail: 'Ready for your next iteration' }, { icon: 'fact_check', label: 'Awaiting review', value: pending, detail: 'Content awaiting admin approval' }, { icon: 'deployed_code', label: 'Active version', value: 'v' + (active?.version || '—'), detail: active ? 'Published ' + dateLabel(active.publishedAt).split(',')[0] : 'No published bundle' }].map(s => <article className="sv-stat" key={s.label}><div><span>{s.label}</span><Icon name={s.icon} /></div><strong>{s.value}</strong><small>{s.detail}</small></article>)}
    </div>
    <section className="sv-pipeline sv-panel"><div><span className="sv-eyebrow">CONTENT LIFECYCLE</span><h2>From the workspace to the game</h2></div><div className="sv-pipeline-steps">{[{ name: 'Author', sub: 'Designer', icon: 'edit_note' }, { name: 'Review', sub: 'Admin approval', icon: 'fact_check' }, { name: 'Publish', sub: 'Versioned JSON', icon: 'deployed_code' }, { name: 'Unity Game', sub: 'Load content bundle', icon: 'sports_esports' }].map((step, i) => <div key={step.name}><span className={'sv-step-icon step-' + i}><Icon name={step.icon} /></span><div><strong>{step.name}</strong><small>{step.sub}</small></div>{i < 3 && <Icon className="sv-step-arrow" name="arrow_forward" />}</div>)}</div></section>
    <div className="sv-dashboard-columns"><section className="sv-panel"><div className="sv-panel-heading"><div><h2>Content in progress</h2><p>Your latest drafts and review status.</p></div>{user && can(user.role, 'author') && <Link to="/admin/content" className="sv-text-link">View all<Icon name="arrow_forward" /></Link>}</div>
      {drafts.length ? <div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>Content bundle</th><th>Status</th><th>Version</th><th /></tr></thead><tbody>{drafts.slice(0, 5).map(d => <tr key={d.id}><td><strong>{d.title}</strong><small>{d.authorName} · {dateLabel(d.updatedAt)}</small></td><td><Status value={d.status} /></td><td className="sv-mono">{d.bundle.bundle_version}</td><td>{user && can(user.role, 'author') && <Link className="sv-table-link" aria-label={'Open ' + d.title} to={'/admin/content/' + d.id}><Icon name="arrow_outward" /></Link>}</td></tr>)}</tbody></table></div> : <Empty title="No drafts yet" description="Create a draft from a published version to begin." />}
    </section><section className="sv-panel"><div className="sv-panel-heading"><div><h2>Recent activity</h2><p>The workspace audit trail.</p></div><Icon name="history" /></div><div className="sv-activity">{state.audit.slice(0, 5).map(a => <div key={a.id}><span className="sv-activity-dot" /><div><strong>{actionLabels[a.action] || a.action}</strong><p>{a.target}</p><small>{a.actor} · {dateLabel(a.at)}</small></div></div>)}</div></section></div>
    <section className="sv-panel"><div className="sv-panel-heading"><div><h2>Published content library</h2><p>The current bundle consumed by the Unity client.</p></div><Link to="/admin/releases" className="sv-text-link">Version history<Icon name="arrow_forward" /></Link></div><div className="sv-library-grid">{collections.map(c => <div key={c.key}><Icon name={c.icon} /><strong>{active?.bundle[c.key].length || 0}</strong><span>{c.label}</span></div>)}</div></section>
  </div>;
}
