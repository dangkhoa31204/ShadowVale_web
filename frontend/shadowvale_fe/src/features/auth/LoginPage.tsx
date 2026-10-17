import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '../../hooks/useAuth';
import { demoAccounts } from '../../services/auth/authService';
import { isDemoMode } from '../../config/environment';
import { safeRedirect } from './access';
import { errorMessage, fieldError } from '../../services/api/errors';
import { Icon } from '../shared/ui';
export function InternalLoginPage() {
  const { user, login, isLoading, sessionError } = useAuth();
  const navigate = useNavigate(), [params] = useSearchParams();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (isLoading) return <div className="portal-state flex items-center gap-2" role="status"><Spinner />Validating your session…</div>;
  if (user) return <Navigate to={safeRedirect(params.get('redirect'), user.role)} replace />;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setFieldErrors({ username: '', password: '' }); setBusy(true);
    try {
      const account = await login({ callsign: email.trim(), password });
      navigate(safeRedirect(params.get('redirect'), account.role), { replace: true });
    } catch (e) { setError(errorMessage(e)); setFieldErrors({ username: fieldError(e, 'UsernameOrEmail'), password: fieldError(e, 'Password') }); }
    finally { setBusy(false); }
  }
  return <div className="portal sv-login">
    <aside className="sv-login-story"><a href="/login" className="sv-brand"><span className="sv-brand-mark">S</span><span>SHADOWVALE</span></a>
      <div><span className="sv-eyebrow">SHADOWVALE · INTERNAL</span><h1>Content operations</h1></div>
    </aside>
    <main className="sv-login-main"><Card className="gap-6 p-8 shadow-2xl">
      <CardHeader className="gap-2 px-0">
        <span className="flex items-center gap-1.5 text-xs tracking-wider text-primary"><Icon name="lock" className="size-3.5" />Internal access</span>
        <CardTitle><h2 className="text-2xl font-semibold">Sign in</h2></CardTitle>
        <CardDescription>Access your team workspace.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={submit} className="grid gap-5">
          <Field data-invalid={!!fieldErrors.username}><FieldLabel htmlFor="login-username">Username or email</FieldLabel><Input id="login-username" data-testid="login-username" className="h-11" type="text" aria-invalid={!!fieldErrors.username} required autoComplete="username" placeholder="Your username or email" value={email} onChange={e => setEmail(e.target.value)} /><FieldError>{fieldErrors.username}</FieldError></Field>
          <Field data-invalid={!!fieldErrors.password}><FieldLabel htmlFor="login-password">Password</FieldLabel>
            <div className="relative"><Input id="login-password" aria-label="Password" className="h-11 pr-11" aria-invalid={!!fieldErrors.password} type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
              <Button type="button" variant="ghost" size="icon-sm" className="absolute top-1/2 right-2 -translate-y-1/2" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'visibility_off' : 'visibility'} /></Button></div>
            <FieldError>{fieldErrors.password}</FieldError></Field>
          {(error || sessionError) && <Alert variant="destructive"><AlertDescription>{error || sessionError}</AlertDescription></Alert>}
          <Button data-testid="login-submit" size="lg" className="h-11" disabled={busy}>{busy && <Spinner />}{busy ? "Signing in…" : "Sign in"}{!busy && <Icon name="arrow_forward" />}</Button>
        </form>
        {isDemoMode && <div className="mt-6 grid gap-2 border-t pt-4"><span className="sv-eyebrow">DEMO</span><div className="flex flex-wrap gap-2">{demoAccounts.map(a => <Button key={a.role} type="button" variant="outline" size="sm" onClick={() => { setEmail(a.callsign); setPassword('ShadowVale123!'); setError(''); }}>{a.role}</Button>)}</div></div>}
      </CardContent>
    </Card></main>
  </div>;
}
