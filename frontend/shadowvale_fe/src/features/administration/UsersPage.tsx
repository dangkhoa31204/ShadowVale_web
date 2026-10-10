import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../content/workspaceContext';
import type { Role } from '../../types/user';
import { isDemoMode } from '../../config/environment';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { dateLabel } from '../shared/format';
const roles: Role[] = ['designer', 'analyst', 'admin'];
export function InternalUsersPage() {
  const { user } = useAuth(), { state, execute, busy } = useWorkspace();
  const [query, setQuery] = useState(''), [roleFilter, setRoleFilter] = useState('all');
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [email, setEmail] = useState(''), [role, setRole] = useState<Role>('designer');
  const [deletingId, setDeletingId] = useState('');
  const users = state.users.filter(u => (roleFilter === 'all' || u.role === roleFilter) && (u.callsign + ' ' + u.email).toLowerCase().includes(query.toLowerCase()));
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await execute({ type: 'createUser', name, email, role }); setCreating(false); setName(''); setEmail(''); }
    catch { /* Provider displays the error. */ }
  }
  return <div className="sv-page"><PageHeading eyebrow="ADMINISTRATION" title="Users & team access" description="Provision internal accounts and assign access to the right workspace." action={<button className="sv-button sv-button-primary" onClick={() => setCreating(!creating)}><Icon name="person_add" />Create user</button>} />
    {isDemoMode && <div className="sv-alert">Demo accounts created here update the team directory. Sign-in uses the three fixed demo accounts shown on the login page; credentials and invitations require the backend.</div>}
    {creating && <form className="sv-panel sv-inline-form sv-form" onSubmit={create}><label>Full name<input required value={name} onChange={e => setName(e.target.value)} /></label><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Role<select value={role} onChange={e => setRole(e.target.value as Role)}>{roles.map(r => <option key={r}>{r}</option>)}</select></label><button className="sv-button sv-button-primary" disabled={busy}>Create account</button><button type="button" className="sv-button" onClick={() => setCreating(false)}>Cancel</button></form>}
    <section className="sv-panel"><div className="sv-table-toolbar"><label className="sv-search"><Icon name="search" /><input aria-label="Search users" placeholder="Search name or email…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filter by role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}><option value="all">All roles</option>{roles.map(r => <option key={r}>{r}</option>)}</select><span>{users.length} accounts</span></div>
      <div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td><strong>{u.callsign}{u.id === user?.id && <span className="sv-you">You</span>}</strong><small>{u.email}</small></td><td><select aria-label={'Role for ' + u.callsign} disabled={busy || u.id === user?.id} value={u.role} onChange={async e => { try { await execute({ type: 'updateUser', id: u.id, role: e.target.value as Role, active: u.active }); } catch { /* reported */ } }}>{roles.map(r => <option key={r}>{r}</option>)}</select></td><td><Status value={u.active ? 'active' : 'inactive'} /></td><td>{dateLabel(u.createdAt).split(',')[0]}</td><td><div className="sv-row-actions"><button className="sv-button sv-button-small" disabled={busy || u.id === user?.id} onClick={async () => { try { await execute({ type: 'updateUser', id: u.id, role: u.role, active: !u.active }); } catch { /* reported */ } }}>{u.active ? 'Deactivate' : 'Activate'}</button><button className="sv-button sv-button-small sv-button-danger" disabled={busy || u.id === user?.id} onClick={() => setDeletingId(u.id)}>Delete</button></div></td></tr>)}</tbody></table></div>{!users.length && <Empty title="No matching users" description="Try another search or role filter." />}
    </section>
    {deletingId && <div className="sv-modal-backdrop"><section className="sv-modal" role="dialog" aria-modal="true" aria-labelledby="delete-user-title"><h2 id="delete-user-title">Delete team account?</h2><p>{state.users.find(u => u.id === deletingId)?.email} will lose access. Published content and audit history remain available.</p><div><button className="sv-button" onClick={() => setDeletingId('')}>Cancel</button><button className="sv-button sv-button-danger" disabled={busy} onClick={async () => { try { await execute({ type: 'deleteUser', id: deletingId }); setDeletingId(''); } catch { /* reported */ } }}>Delete account</button></div></section></div>}
  </div>;
}
