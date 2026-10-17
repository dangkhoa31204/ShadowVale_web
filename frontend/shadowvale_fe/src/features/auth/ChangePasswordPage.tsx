import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authService } from '../../services/auth/authService';
import { errorMessage, fieldError } from '../../services/api/errors';
import { isDemoMode } from '../../config/environment';
import { Icon, PageHeading, Panel } from '../shared/ui';

export function ChangePasswordPage() {
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false), [error, setError] = useState('');
  const [fields, setFields] = useState({ current: '', next: '' });
  // Success clears the session, so the router returns to sign-in.
  const change = useMutation({
    mutationFn: () => authService.changePassword(current, next),
    onError: e => { setError(errorMessage(e)); setFields({ current: fieldError(e, 'CurrentPassword'), next: fieldError(e, 'NewPassword') }); },
  });
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setFields({ current: '', next: '' });
    if (next !== confirm) { setError('Passwords do not match.'); return; }
    change.mutate();
  }
  const busy = change.isPending, type = show ? 'text' : 'password';
  return <div className="sv-page">
    <PageHeading title="Change password" description="Changing your password ends existing sessions." />
    <Panel title="Account security" action={<Icon name="lock" className="text-muted-foreground" />} className="w-full max-w-xl">
      {isDemoMode ? <p className="p-6 text-sm text-muted-foreground">Password changes are unavailable in demo mode.</p> : <form className="p-6" onSubmit={submit}><fieldset className="grid gap-5" disabled={busy}>
        <Field data-invalid={!!fields.current}><FieldLabel htmlFor="password-current">Current password</FieldLabel><Input id="password-current" required type={type} autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} aria-invalid={!!fields.current} /><FieldError>{fields.current}</FieldError></Field>
        <Field data-invalid={!!fields.next}><FieldLabel htmlFor="password-new">New password</FieldLabel><Input id="password-new" required type={type} autoComplete="new-password" minLength={8} maxLength={128} value={next} onChange={e => setNext(e.target.value)} aria-invalid={!!fields.next} />{fields.next ? <FieldError>{fields.next}</FieldError> : <FieldDescription>8–128 characters.</FieldDescription>}</Field>
        <Field><FieldLabel htmlFor="password-confirm">Confirm new password</FieldLabel><Input id="password-confirm" required type={type} autoComplete="new-password" minLength={8} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></Field>
        <Field orientation="horizontal"><Checkbox id="password-show" checked={show} onCheckedChange={value => setShow(value === true)} /><FieldLabel htmlFor="password-show" className="font-normal">Show passwords</FieldLabel></Field>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <Button className="w-fit" disabled={busy || !current || next.length < 8 || next !== confirm}>{busy ? <Spinner /> : <Icon name="lock_reset" />}{busy ? 'Saving…' : 'Change password'}</Button>
      </fieldset></form>}
    </Panel>
  </div>;
}
