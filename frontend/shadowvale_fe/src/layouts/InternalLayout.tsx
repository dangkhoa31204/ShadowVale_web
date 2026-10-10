import { PreferencesControls } from '../features/preferences/PreferencesControls';
import { useTranslation } from '../features/preferences/preferencesContext';
import { useState } from 'react';
import '../features/releases/adminWorkspace.css';
import { AccountMenu } from '../features/auth/AccountMenu';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { navigationForRole } from '../features/auth/access';
import { isDemoMode } from '../config/environment';
import { WorkspaceProvider } from '../features/content/WorkspaceProvider';
import { useWorkspace } from '../features/content/workspaceContext';
import { Icon } from '../features/shared/ui';
import { GameDeliveryProvider } from '../features/gameDelivery/GameDeliveryProvider';
function Shell() {
  const t = useTranslation();
  const { user, logout } = useAuth(), { state } = useWorkspace();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = user ? navigationForRole(user.role) : [];
  const active = state.releases.find(r => r.id === state.activeReleaseId);
  async function signOut() { try { await logout(); } finally { navigate('/login', { replace: true }); } }
  return <div className="portal sv-shell">
    <a className="sv-skip" href="#workspace-main">{t('Skip to content')}</a>
    {open && <button className="sv-sidebar-scrim" aria-label={t("Close navigation")} onClick={() => setOpen(false)} />}
    <aside id="portal-sidebar" className={'sv-sidebar ' + (open ? 'is-open' : '')}>
      <Link to="/admin" className="sv-brand" onClick={() => setOpen(false)}><span className="sv-brand-mark">S</span><span>SHADOWVALE</span></Link>
      <nav aria-label={t("Main navigation")}><span className="sv-nav-heading">{t('Workspace')}</span>{links.map(n => <NavLink key={n.path} to={n.path} onClick={() => setOpen(false)} className={({ isActive }) => 'sv-nav-link ' + (isActive ? 'is-active' : '')}><Icon name={n.icon} /><span>{t(n.label)}</span>{n.path === '/admin/reviews' && state.drafts.filter(d => d.status === 'in_review').length > 0 && <b>{state.drafts.filter(d => d.status === 'in_review').length}</b>}</NavLink>)}</nav>
      <div className="sv-sidebar-bottom"><div className="sv-game-card"><Icon name="deployed_code" /><div><span>{t('Published content')}</span><strong>{active ? '#' + active.version_no : '—'}</strong></div></div>
        <div className="sv-user"><span className="sv-avatar">{user?.callsign[0]}</span><div><strong>{user?.callsign}</strong><small>{t(user?.role === 'admin' ? 'Admin' : user?.role === 'designer' ? 'Designer' : 'Analyst')}</small></div><button onClick={signOut} aria-label={t("Sign out")} title={t("Sign out")}><Icon name="logout" /></button></div>
      </div>
    </aside>
    <div className="sv-shell-body"><header className="sv-header"><div><button className="sv-menu-button" onClick={() => setOpen(!open)} aria-label={t("Toggle navigation")} aria-controls="portal-sidebar" aria-expanded={open}><Icon name="menu" /></button><span className="sv-header-role">{t(user?.role === 'admin' ? 'Admin workspace' : user?.role === 'designer' ? 'Designer workspace' : 'Analyst workspace')}</span></div><div className="sv-header-tools"><PreferencesControls /><AccountMenu /></div>{isDemoMode && <span className="sv-mode is-demo">{t("DEMO")}</span>}</header>
      <main id="workspace-main" className="sv-main"><Outlet /></main>
    </div>
  </div>;
}
export function InternalLayout() {
  const { user } = useAuth();
  return <WorkspaceProvider key={user?.id}>{isDemoMode && user?.role === 'admin' ? <GameDeliveryProvider><Shell /></GameDeliveryProvider> : <Shell />}</WorkspaceProvider>;
}
