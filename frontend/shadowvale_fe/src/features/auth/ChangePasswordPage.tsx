import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth/authService';
import { errorMessage, fieldError } from '../../services/api/errors';
import { isDemoMode } from '../../config/environment';
import { Icon, PageHeading } from '../shared/ui';
import { useTranslation } from '../preferences/preferencesContext';

export function ChangePasswordPage() {
  const t = useTranslation();
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [fields, setFields] = useState({ current: '', next: '' });
  async function change(e: React.FormEvent) {
    e.preventDefault(); setError(''); setFields({ current: '', next: '' });
    if (next !== confirm) { setError(t('Passwords do not match.')); return; }
    setBusy(true);
    try { await authService.changePassword(current, next); }
    catch (e) { setError(errorMessage(e)); setFields({ current: fieldError(e, 'CurrentPassword'), next: fieldError(e, 'NewPassword') }); }
    finally { setBusy(false); }
  }
  return <div className="sv-page sv-password-page">
    <PageHeading title={t('Change password')} description={t('Changing your password ends existing sessions.')} action={<Link className="sv-button" to="/admin/profile"><Icon name="person" />{t('Back to Profile')}</Link>} />
    <section className="sv-panel sv-password-panel"><div className="sv-panel-heading"><h2>{t('Account security')}</h2><Icon name="lock" /></div>
      {isDemoMode ? <p className="sv-profile-note">{t('Password changes are unavailable in demo mode.')}</p> : <form className="sv-form sv-profile-security" onSubmit={change}><fieldset className="sv-form sv-modal-fields" disabled={busy}>
        <label>{t('Current password')}<input required type={show ? 'text' : 'password'} autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} aria-invalid={!!fields.current} /><small role="alert">{fields.current}</small></label>
        <label>{t('New password')}<input required type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} value={next} onChange={e => setNext(e.target.value)} aria-invalid={!!fields.next} /><small role={fields.next ? 'alert' : undefined}>{fields.next || t('8–128 characters.')}</small></label>
        <label>{t('Confirm new password')}<input required type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <label className="sv-checkbox"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />{t('Show passwords')}</label>
        {error && <div className="sv-alert sv-alert-error" role="alert">{error}</div>}
        <div className="sv-row-actions"><button className="sv-button sv-button-primary" disabled={busy || !current || next.length < 8 || next !== confirm}><Icon name="lock_reset" />{t(busy ? 'Saving…' : 'Change password')}</button></div>
      </fieldset></form>}
    </section>
  </div>;
}
