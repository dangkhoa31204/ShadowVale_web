import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountMenu } from '../features/auth/AccountMenu';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { navigationForRole } from '../features/auth/access';
import { isDemoMode } from '../config/environment';
import { WorkspaceProvider } from '../features/content/WorkspaceProvider';
import { useWorkspace } from '../features/content/workspaceContext';
import { Icon } from '../features/shared/ui';
const roleName = { admin: 'Admin', designer: 'Designer', analyst: 'Analyst' } as const;
function Shell() {
  const { user, logout } = useAuth(), { state } = useWorkspace();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = user ? navigationForRole(user.role) : [];
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  const inReview = state.drafts.filter(d => d.status === 'in_review').length;
  async function signOut() { try { await logout(); } finally { navigate('/login', { replace: true }); } }
  return <div className="portal sv-shell">
    <a className="sv-skip" href="#workspace-main">Skip to content</a>
    {open && <button className="sv-sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside id="portal-sidebar" className={'sv-sidebar ' + (open ? 'is-open' : '')}>
      <Link to="/admin" className="sv-brand" onClick={() => setOpen(false)}><span className="sv-brand-mark">S</span><span>SHADOWVALE</span></Link>
      <nav aria-label="Main navigation"><span className="sv-nav-heading">Workspace</span>{links.map(n => <NavLink key={n.path} to={n.path} onClick={() => setOpen(false)} className={({ isActive }) => 'sv-nav-link ' + (isActive ? 'is-active' : '')}><Icon name={n.icon} /><span>{n.label}</span>{n.path === '/admin/reviews' && inReview > 0 && <Badge className="ml-auto">{inReview}</Badge>}</NavLink>)}</nav>
      <div className="sv-sidebar-bottom">{user?.role !== 'analyst' && <div className="sv-game-card"><Icon name="deployed_code" /><div><span>Published content</span><strong>{active ? '#' + active.version_no : '—'}</strong></div></div>}
        <div className="sv-user"><span className="sv-avatar">{user?.callsign[0]}</span><div><strong>{user?.callsign}</strong><small>{user && roleName[user.role]}</small></div><Button variant="ghost" size="icon-sm" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="logout" /></Button></div>
      </div>
    </aside>
    <div className="sv-shell-body"><header className="sv-header"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" className="min-[761px]:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-controls="portal-sidebar" aria-expanded={open}><Icon name="menu" /></Button><span className="sv-header-role">{user && roleName[user.role] + ' workspace'}</span></div><div className="sv-header-tools">{isDemoMode && <Badge variant="outline" className="font-mono text-warning">DEMO</Badge>}<AccountMenu /></div></header>
      <main id="workspace-main" className="sv-main"><Outlet /></main>
    </div>
  </div>;
}
export function InternalLayout() {
  const { user } = useAuth();
  return <WorkspaceProvider key={user?.id}><Shell /></WorkspaceProvider>;
}
