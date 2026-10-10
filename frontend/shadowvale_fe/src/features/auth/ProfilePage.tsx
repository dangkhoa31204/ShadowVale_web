import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Icon, PageHeading } from '../shared/ui';
import { PreferencesControls } from '../preferences/PreferencesControls';
import { usePreferences } from '../preferences/preferencesContext';

export function ProfilePage() {
  const { user } = useAuth(), { t, locale } = usePreferences();
  return <div className="sv-page sv-profile-page">
    <PageHeading title={t('Profile')} description={t('Your account and display preferences.')} />
    <section className="sv-panel sv-profile-banner"><div><span className="sv-avatar sv-profile-avatar">{user?.callsign.charAt(0).toUpperCase()}</span><div><span className="sv-eyebrow">SHADOWVALE</span><h2>{user?.callsign}</h2><span className="sv-profile-role"><Icon name="shield_person" />{t(user?.role === 'admin' ? 'Admin' : user?.role === 'designer' ? 'Designer' : 'Analyst')}</span></div></div></section>
    <div className="sv-profile-grid">
      <section className="sv-panel"><div className="sv-panel-heading"><h2>{t('Account details')}</h2><Icon name="badge" /></div><dl className="sv-profile-facts"><div><dt>{t('Username')}</dt><dd>{user?.username || '—'}</dd></div><div><dt>{t('Full name')}</dt><dd>{user?.fullName || user?.callsign}</dd></div><div><dt>{t('Email')}</dt><dd>{user?.email}</dd></div><div><dt>{t('Joined')}</dt><dd>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-GB') : '—'}</dd></div></dl><p className="sv-profile-note">{t('Contact an administrator to update your account details.')}</p></section>
      <div className="sv-profile-details"><section className="sv-panel"><div className="sv-panel-heading"><h2>{t('Display preferences')}</h2><Icon name="tune" /></div><div className="sv-profile-preferences"><PreferencesControls /><p>{t('Language and theme are saved on this browser.')}</p></div></section>
        <div className="sv-row-actions"><Link className="sv-button" to="/admin/change-password"><Icon name="lock_reset" />{t('Change password')}</Link><Link className="sv-button" to="/admin/analytics"><Icon name="monitoring" />{t('Open Analytics')}</Link></div>
      </div>
    </div>
  </div>;
}
