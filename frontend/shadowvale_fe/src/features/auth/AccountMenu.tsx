import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Icon } from '../shared/ui';
import { useTranslation } from '../preferences/preferencesContext';
export function AccountMenu() {
  const { user, logout } = useAuth(), t = useTranslation();
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', close); return () => document.removeEventListener('click', close);
  }, []);
  return <div className="sv-account-menu" ref={ref} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
    <button className="sv-button sv-button-small" aria-label={t('Account')} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="account_circle" /><span className="sv-account-name">{user?.callsign}</span><Icon name="expand_more" /></button>
    {open && <div className="sv-account-dropdown"><strong>{user?.callsign}</strong><small>{user?.email}</small><Link to="/admin/profile" onClick={() => setOpen(false)}><Icon name="person" />{t('Profile')}</Link><Link to="/admin/change-password" onClick={() => setOpen(false)}><Icon name="lock_reset" />{t('Change password')}</Link><Link to="/admin/analytics" onClick={() => setOpen(false)}><Icon name="monitoring" />{t('Analytics')}</Link><button onClick={() => void logout().catch(() => setOpen(false))}><Icon name="logout" />{t('Sign out')}</button></div>}
  </div>;
}
