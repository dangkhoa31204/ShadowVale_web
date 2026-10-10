import { useTranslation } from '../preferences/preferencesContext';
import { PreferencesControls } from '../preferences/PreferencesControls';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { demoAccounts } from '../../services/auth/authService';
import { isDemoMode } from '../../config/environment';
import { homeForRole, safeRedirect } from './access';
import { errorMessage, fieldError } from '../../services/api/errors';
import { Icon } from '../shared/ui';
export function InternalLoginPage() {
  const t = useTranslation();
  const { user, login, isLoading, sessionError } = useAuth();
  const navigate = useNavigate(), [params] = useSearchParams();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false), [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (isLoading) return <div className="portal-state">{t("Validating your session…")}</div>;
  if (user) return <Navigate to={homeForRole(user.role)} replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setFieldErrors({ username: '', password: '' }); setBusy(true);
    try {
      const account = await login({ callsign: email.trim(), password, rememberMe: remember });
      navigate(safeRedirect(params.get('redirect'), account.role), { replace: true });
    } catch (e) { setError(errorMessage(e)); setFieldErrors({ username: fieldError(e, 'UsernameOrEmail'), password: fieldError(e, 'Password') }); }
    finally { setBusy(false); }
  }
  return <div className="portal sv-login">
    <div className="sv-login-preferences"><PreferencesControls /></div>
    <aside className="sv-login-story"><a href="/login" className="sv-brand"><span className="sv-brand-mark">S</span><span>SHADOWVALE</span></a>
      <div><span className="sv-eyebrow">{t("SHADOWVALE · INTERNAL")}</span><h1>{t("Content operations")}</h1>
        <div className="sv-login-flow"><Icon name="edit_note" /><span>{t("Author")}</span><i /><Icon name="fact_check" /><span>{t("Review")}</span><i /><Icon name="deployed_code" /><span>{t("Publish")}</span></div></div>
    </aside>
    <main className="sv-login-main"><div className="sv-login-card"><span className="sv-internal-tag"><Icon name="lock" /> {t("Internal access")}</span>
      <h2>{t("Sign in")}</h2><p className="sv-login-intro">{t("Access your team workspace.")}</p>
      <form onSubmit={submit} className="sv-form">
        <label>{t("Username or email")}<input type="text" aria-invalid={!!fieldErrors.username} required autoComplete="username" placeholder={t("Your username or email")} value={email} onChange={e => setEmail(e.target.value)} /><small role="alert">{fieldErrors.username}</small></label>
        <label>{t("Password")}<div className="sv-password"><input aria-label={t("Password")} aria-invalid={!!fieldErrors.password} type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder={t("Enter your password")} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={showPassword ? t("Hide password") : t("Show password")} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'visibility_off' : 'visibility'} /></button></div><small role="alert">{fieldErrors.password}</small></label>
        <label className="sv-checkbox"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />{t("Keep me signed in")}</label>
        {(error || sessionError) && <div className="sv-alert sv-alert-error" role="alert">{error || sessionError}</div>}
        <button className="sv-button sv-button-primary sv-full" disabled={busy}>{busy ? t("Signing in…") : t("Sign in")}<Icon name="arrow_forward" /></button>
      </form>
      {isDemoMode && <div className="sv-demo-accounts"><span className="sv-eyebrow">{t("DEMO")}</span><div>{demoAccounts.map(a => <button key={a.role} className="sv-button" onClick={() => { setEmail(a.callsign); setPassword('ShadowVale123!'); setError(''); }}>{a.role}</button>)}</div></div>}
    </div></main>
  </div>;
}
