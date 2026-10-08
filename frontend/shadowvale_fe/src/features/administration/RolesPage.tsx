import { can, type Permission } from '../auth/access';
import type { Role } from '../../types/user';
import { Icon, PageHeading } from '../shared/ui';
const roles: Role[] = ['designer', 'analyst', 'admin'];
const rows: { permission: Permission; label: string }[] = [
  { permission: 'author', label: 'Author content & submit drafts' }, { permission: 'review', label: 'Review & approve content' },
  { permission: 'publish', label: 'Publish & restore versions' }, { permission: 'versions', label: 'View history, compare & export JSON' },
  { permission: 'analytics', label: 'Telemetry & AI comparison' }, { permission: 'users', label: 'Manage users & assign roles' },
  { permission: 'settings', label: 'Configure the platform' },
];
export function InternalRolesPage() {
  return <div className="sv-page"><PageHeading eyebrow="ADMINISTRATION" title="Roles & permissions" description="One shared access policy controls navigation, protected routes and workspace actions." />
    <div className="sv-role-cards">{[{ role: 'Designer', icon: 'edit_note', description: 'Author game data, validate drafts and submit content for review.' }, { role: 'Analyst', icon: 'monitoring', description: 'Inspect player telemetry, difficulty and AI performance by content version.' }, { role: 'Admin', icon: 'admin_panel_settings', description: 'Review content, publish versions and manage team access and configuration.' }].map(r => <article className="sv-panel" key={r.role}><Icon name={r.icon} /><h2>{r.role}</h2><p>{r.description}</p></article>)}</div>
    <section className="sv-panel"><div className="sv-panel-heading"><h2>Permission matrix</h2><span className="sv-mode">FIXED ROLE POLICY</span></div><div className="sv-table-wrap"><table className="sv-table sv-permission-table"><thead><tr><th>Capability</th>{roles.map(r => <th key={r}>{r}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.permission}><td>{row.label}</td>{roles.map(role => <td key={role}><span className={can(role, row.permission) ? 'sv-allowed' : 'sv-denied'}>{can(role, row.permission) ? 'Allowed' : '—'}</span></td>)}</tr>)}</tbody></table></div></section>
    <div className="sv-alert">Account roles are assigned in Users. The backend must enforce the same permission policy on every protected endpoint.</div>
  </div>;
}
