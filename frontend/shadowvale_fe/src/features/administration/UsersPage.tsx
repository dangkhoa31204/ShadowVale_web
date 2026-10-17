import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '../../hooks/useAuth';
import { isDemoMode } from '../../config/environment';
import type { UserDto } from '../../services/api/contracts';
import { storageService } from '../../services/storage/storageService';
import { userFromApi } from '../../services/auth/userAdapter';
import { usersApi } from './usersApi';
import { errorMessage, fieldError } from '../../services/api/errors';
import { Empty, Icon, PageHeading, Panel, Status, panelTable } from '../shared/ui';
import { Modal } from '../shared/Modal';
const roles = ['Admin', 'Designer', 'Analyst'];
const pageSize = 20;
const blank = { username: '', email: '', fullName: '', role: 'Designer', isActive: true, password: '', confirm: '' };
type DialogType = 'create' | 'edit' | 'password' | 'status';
const fieldKeys = ['Username', 'Email', 'FullName', 'Role', 'Password', 'NewPassword', 'IsActive'];
const date = (value: string | null) => value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function InternalUsersPage() {
  const { user } = useAuth(), queryClient = useQueryClient();
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [role, setRole] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ type: DialogType; account?: UserDto } | null>(null);
  const [form, setForm] = useState(blank), [modalError, setModalError] = useState(''), [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => { const id = setTimeout(() => { setQuery(search); setPage(1); }, 300); return () => clearTimeout(id); }, [search]);
  const filters = { search: query || undefined, role: role || undefined, isActive: status ? status === 'active' : undefined, page, pageSize };
  const list = useQuery({ queryKey: ['users', filters], queryFn: ({ signal }) => usersApi.list(filters, signal), enabled: !isDemoMode, placeholderData: keepPreviousData });
  // Edit and status dialogs start from the latest server copy of the account.
  const details = useMutation({ mutationFn: (account: UserDto) => usersApi.details(account.id), onError: e => { toast.error(errorMessage(e)); } });
  const save = useMutation({
    mutationFn: async ({ type, account }: NonNullable<typeof dialog>) => {
      if (type === 'create') return usersApi.create({ username: form.username.trim(), email: form.email.trim(), fullName: form.fullName.trim() || null, role: form.role, password: form.password });
      if (!account) return;
      if (type === 'password') return usersApi.resetPassword(account.id, form.password);
      const saved = await usersApi.update(account.id, { email: form.email.trim(), fullName: form.fullName.trim() || null, role: form.role, isActive: type === 'status' ? !account.isActive : form.isActive });
      const session = storageService.getSession();
      if (saved.id === user?.id && session) storageService.setSession({ ...session, user: userFromApi(saved), generation: (session.generation || 0) + 1 });
    },
    onSuccess: (_, { type }) => {
      setDialog(null); setForm(blank);
      toast.success(type === 'password' ? 'Password reset. Existing sessions were ended.' : 'Account saved.');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: e => { setModalError(errorMessage(e)); setFields(Object.fromEntries(fieldKeys.map(key => [key, fieldError(e, key) || '']))); },
  });
  const busy = details.isPending || save.isPending;
  async function open(type: DialogType, account?: UserDto) {
    setFields({}); setModalError('');
    if (account && type !== 'password') account = await details.mutateAsync(account).catch(() => undefined);
    if (type !== 'create' && !account) return;
    setForm({ ...blank, ...(account ? { username: account.username, email: account.email, fullName: account.fullName || '', role: account.role, isActive: account.isActive } : {}) });
    setDialog({ type, account });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault(); if (!dialog) return;
    setModalError(''); setFields({});
    if ((dialog.type === 'create' || dialog.type === 'password') && form.password !== form.confirm) { setModalError('Passwords do not match.'); return; }
    save.mutate(dialog);
  }
  const rows = list.data?.items ?? [], total = Number(list.data?.totalCount ?? 0), pages = Math.max(1, Math.ceil(total / pageSize));
  const own = dialog?.account?.id === user?.id;
  const set = (key: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });
  const title = dialog?.type === 'create' ? 'Create user' : dialog?.type === 'edit' ? 'Edit account' : dialog?.type === 'password' ? 'Reset password' : dialog?.account?.isActive ? 'Deactivate account?' : 'Activate account?';
  return <div className="sv-page">
    <PageHeading title="User management" description="Manage internal accounts, roles and access." action={<>
      <Button variant="outline" disabled={busy || list.isFetching || isDemoMode} onClick={() => void list.refetch()}><Icon name="sync" />Refresh</Button>
      <Button disabled={busy || isDemoMode} onClick={() => void open('create')}><Icon name="person_add" />Create user</Button>
    </>} />
    {isDemoMode ? <Empty title="User API unavailable in demo mode" description="Switch to API mode to manage server accounts." /> : <>
      {list.error && <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-4">{errorMessage(list.error)}<Button variant="outline" size="sm" onClick={() => void list.refetch()}>Retry</Button></AlertDescription></Alert>}
      <Panel>
        <div className="grid grid-cols-2 items-end gap-4 border-b p-5 md:grid-cols-[minmax(220px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto]">
          <Field className="col-span-2 md:col-span-1"><FieldLabel htmlFor="users-search">Search users</FieldLabel><div className="relative"><Icon name="search" className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" /><Input id="users-search" type="search" className="pl-8" placeholder="Username, name or email" value={search} onChange={e => setSearch(e.target.value)} /></div></Field>
          <Field><FieldLabel htmlFor="users-role">Role</FieldLabel><NativeSelect id="users-role" className="w-full" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><NativeSelectOption value="">All roles</NativeSelectOption>{roles.map(r => <NativeSelectOption key={r} value={r}>{r}</NativeSelectOption>)}</NativeSelect></Field>
          <Field><FieldLabel htmlFor="users-status">Status</FieldLabel><NativeSelect id="users-status" className="w-full" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><NativeSelectOption value="">All accounts</NativeSelectOption><NativeSelectOption value="active">Active</NativeSelectOption><NativeSelectOption value="inactive">Inactive</NativeSelectOption></NativeSelect></Field>
          <span className="col-span-2 text-xs text-muted-foreground md:col-span-1 md:pb-2">{`${total} accounts`}</span>
        </div>
        {list.isPending ? <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground" role="status"><Spinner />Loading users…</div> : <>
          <Table className={panelTable}>
            <TableHeader><TableRow>{['User', 'Role', 'Status', 'Last sign-in', 'Actions'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{rows.map(u => <TableRow key={u.id}>
              <TableCell><div className="flex min-w-60 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-medium text-primary">{(u.fullName || u.username).charAt(0).toUpperCase()}</span><div><div className="font-medium">{u.fullName || u.username}{u.id === user?.id && <Badge variant="secondary" className="ml-2 text-primary">You</Badge>}</div><div className="text-xs text-muted-foreground">@{u.username} · {u.email}</div></div></div></TableCell>
              <TableCell><span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap"><Icon name={u.role === 'Admin' ? 'shield_person' : u.role === 'Designer' ? 'edit_note' : 'monitoring'} />{u.role}</span></TableCell>
              <TableCell><Status value={u.isActive ? 'active' : 'inactive'} /></TableCell>
              <TableCell>{date(u.lastLoginAt)}</TableCell>
              <TableCell><div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void open('edit', u)}><Icon name="edit" />Edit</Button>
                <Button variant="outline" size="sm" disabled={busy || u.id === user?.id} onClick={() => void open('status', u)}>{u.isActive ? 'Deactivate' : 'Activate'}</Button>
                <Button variant="outline" size="sm" disabled={busy || u.id === user?.id} onClick={() => void open('password', u)} title={u.id === user?.id ? 'Change your password from the Account menu' : undefined}><Icon name="key" />Reset password</Button>
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table>
          {!rows.length && <Empty title="No matching users" description="Try another search or role filter." />}
          <div className="flex items-center justify-center gap-4 border-t px-6 py-4 text-xs text-muted-foreground sm:justify-end">
            <Button variant="outline" size="sm" disabled={page <= 1 || list.isFetching} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span>{`Page ${page} of ${pages}`}</span>
            <Button variant="outline" size="sm" disabled={page >= pages || list.isFetching} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </>}
      </Panel>
      <p className="text-xs text-muted-foreground">Deactivate an account to remove access. Username cannot be changed.</p>
    </>}
    {dialog && <Modal title={title} description={dialog.account && `${dialog.account.email} · @${dialog.account.username}`} onClose={() => setDialog(null)} busy={busy}>
      <form onSubmit={submit}><fieldset className="grid gap-4" disabled={busy}>
        {(dialog.type === 'create' || dialog.type === 'edit') && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!fields.Username}><FieldLabel htmlFor="user-username">Username</FieldLabel><Input id="user-username" required pattern="[a-zA-Z0-9_.\-]{3,50}" minLength={3} maxLength={50} autoComplete="off" readOnly={dialog.type === 'edit'} value={form.username} onChange={set('username')} /><FieldError>{fields.Username}</FieldError></Field>
            <Field data-invalid={!!fields.FullName}><FieldLabel htmlFor="user-fullname">Full name</FieldLabel><Input id="user-fullname" maxLength={100} value={form.fullName} onChange={set('fullName')} /><FieldError>{fields.FullName}</FieldError></Field>
          </div>
          <Field data-invalid={!!fields.Email}><FieldLabel htmlFor="user-email">Email</FieldLabel><Input id="user-email" required type="email" maxLength={256} value={form.email} onChange={set('email')} /><FieldError>{fields.Email}</FieldError></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!fields.Role}><FieldLabel htmlFor="user-role">Role</FieldLabel><NativeSelect id="user-role" className="w-full" disabled={own} value={form.role} onChange={set('role')}>{roles.map(r => <NativeSelectOption key={r} value={r}>{r}</NativeSelectOption>)}</NativeSelect><FieldError>{fields.Role}</FieldError></Field>
            {dialog.type === 'edit' && <Field data-invalid={!!fields.IsActive}><FieldLabel htmlFor="user-active">Status</FieldLabel><NativeSelect id="user-active" className="w-full" disabled={own} value={String(form.isActive)} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}><NativeSelectOption value="true">Active</NativeSelectOption><NativeSelectOption value="false">Inactive</NativeSelectOption></NativeSelect><FieldError>{fields.IsActive}</FieldError></Field>}
          </div>
          {own && <FieldDescription>You cannot change your own role or deactivate your account.</FieldDescription>}
        </>}
        {(dialog.type === 'create' || dialog.type === 'password') && <>
          <Field data-invalid={!!(fields.Password || fields.NewPassword)}><FieldLabel htmlFor="user-password">New password</FieldLabel><Input id="user-password" required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} /><FieldDescription>8–128 characters.</FieldDescription><FieldError>{fields.Password || fields.NewPassword}</FieldError></Field>
          <Field><FieldLabel htmlFor="user-confirm">Confirm new password</FieldLabel><Input id="user-confirm" required type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></Field>
        </>}
        {dialog.type === 'password' && <p className="text-sm text-muted-foreground">Resetting this password ends the account’s existing sessions.</p>}
        {dialog.type === 'status' && <p className="text-sm text-muted-foreground">{dialog.account?.isActive ? 'This account will lose access to the portal.' : 'This account will be able to sign in again.'}</p>}
        {modalError && <Alert variant="destructive"><AlertDescription>{modalError}</AlertDescription></Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant={dialog.type === 'status' && dialog.account?.isActive ? 'destructive' : 'default'}>{save.isPending && <Spinner />}{save.isPending ? 'Saving…' : dialog.type === 'password' ? 'Reset password' : dialog.type === 'status' ? dialog.account?.isActive ? 'Deactivate' : 'Activate' : 'Save account'}</Button>
        </div>
      </fieldset></form>
    </Modal>}
  </div>;
}
