import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isDemoMode } from '../../config/environment';
import type { UserDto } from '../../services/api/contracts';
import { storageService } from '../../services/storage/storageService';
import { userFromApi } from '../../services/auth/userAdapter';
import { usersApi } from './usersApi';
import { errorMessage, fieldError } from '../../services/api/errors';
import { Empty, Icon, PageHeading, Status } from '../shared/ui';
import { Modal } from '../shared/Modal';
import { useTranslation } from '../preferences/preferencesContext';
const roles = ['Admin', 'Designer', 'Analyst'];
const blank = { username: '', email: '', fullName: '', role: 'Designer', isActive: true, password: '', confirm: '' };
export function InternalUsersPage() {
  const t = useTranslation(), { user } = useAuth();
  const [rows, setRows] = useState<UserDto[]>([]), [total, setTotal] = useState(0);
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [role, setRole] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [modalError, setModalError] = useState(''), [fields, setFields] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<{ type: 'create' | 'edit' | 'password' | 'status'; account?: UserDto } | null>(null);
  const [form, setForm] = useState(blank);
  useEffect(() => { const id = setTimeout(() => { setQuery(search); setPage(1); }, 300); return () => clearTimeout(id); }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    if (isDemoMode) return;
    usersApi.list({ search: query || undefined, role: role || undefined, isActive: status ? status === 'active' : undefined, page }, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRows(data.items); setTotal(Number(data.totalCount)); setError(''); setLoading(false); } })
      .catch(e => { if (!controller.signal.aborted) { setError(errorMessage(e)); setLoading(false); } });
    return () => controller.abort();
  }, [query, role, status, page, retry]);
  function refresh() { setLoading(true); setRetry(r => r + 1); }
  async function open(type: NonNullable<typeof dialog>['type'], account?: UserDto) {
    setFields({}); setModalError(''); setNotice('');
    if (account && type !== 'password') {
      setBusy(true); try { account = await usersApi.details(account.id); } catch (e) { setError(errorMessage(e)); return; } finally { setBusy(false); }
    }
    setForm({ ...blank, ...(account ? { username: account.username, email: account.email, fullName: account.fullName || '', role: account.role, isActive: account.isActive } : {}) });
    setDialog({ type, account });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!dialog) return;
    setModalError(''); setFields({});
    if ((dialog.type === 'create' || dialog.type === 'password') && form.password !== form.confirm) { setModalError(t('Passwords do not match.')); return; }
    setBusy(true);
    try {
      const account = dialog.account;
      if (dialog.type === 'create') await usersApi.create({ username: form.username.trim(), email: form.email.trim(), fullName: form.fullName.trim() || null, role: form.role, password: form.password });
      else if (account && dialog.type === 'password') await usersApi.resetPassword(account.id, form.password);
      else if (account) {
        const saved = await usersApi.update(account.id, { email: form.email.trim(), fullName: form.fullName.trim() || null, role: form.role, isActive: dialog.type === 'status' ? !account.isActive : form.isActive });
        const session = storageService.getSession(); if (saved.id === user?.id && session) storageService.setSession({ ...session, user: userFromApi(saved), generation: (session.generation || 0) + 1 });
      }
      setDialog(null); setForm(blank); setNotice(t(dialog.type === 'password' ? 'Password reset. Existing sessions were ended.' : 'Account saved.')); refresh();
    } catch (e) {
      setModalError(errorMessage(e)); setFields(Object.fromEntries(['Username', 'Email', 'FullName', 'Role', 'Password', 'NewPassword', 'IsActive'].map(key => [key, fieldError(e, key)])));
    } finally { setBusy(false); }
  }
  const pages = Math.max(1, Math.ceil(total / 20)), own = dialog?.account?.id === user?.id;
  const date = (value: string | null) => value ? new Date(value).toLocaleString(document.documentElement.lang === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  return <div className="sv-page">
    <PageHeading title={t("User management")} description={t("Manage internal accounts, roles and access.")} action={<div className="sv-row-actions"><button className="sv-button" disabled={busy || loading || isDemoMode} onClick={refresh}><Icon name="sync" />{t('Refresh')}</button><button className="sv-button sv-button-primary" disabled={busy || isDemoMode} onClick={() => void open('create')}><Icon name="person_add" />{t('Create user')}</button></div>} />
    {isDemoMode ? <Empty title={t("User API unavailable in demo mode")} description={t("Switch to API mode to manage server accounts.")} /> : <>
      {error && <div className="sv-alert sv-alert-error" role="alert">{error}<button className="sv-button" onClick={refresh}>{t('Retry')}</button></div>}
      {notice && <div className="sv-alert" role="status">{notice}</div>}
      <section className="sv-panel sv-users">
        <div className="sv-users-filters sv-form"><label>{t('Search users')}<div className="sv-search"><Icon name="search" /><input type="search" placeholder={t('Username, name or email')} value={search} onChange={e => setSearch(e.target.value)} /></div></label><label>{t('Role')}<select value={role} onChange={e => { setRole(e.target.value); setPage(1); setLoading(true); }}><option value="">{t('All roles')}</option>{roles.map(r => <option key={r} value={r}>{t(r)}</option>)}</select></label><label>{t('Status')}<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); setLoading(true); }}><option value="">{t('All accounts')}</option><option value="active">{t('Active')}</option><option value="inactive">{t('Inactive')}</option></select></label><span className="sv-users-count">{t('{count} accounts', { count: total })}</span></div>
        {loading ? <div className="sv-empty" role="status">{t('Loading users…')}</div> : <><div className="sv-table-wrap"><table className="sv-table"><thead><tr>{['User', 'Role', 'Status', 'Last sign-in', 'Actions'].map(h => <th key={h}>{t(h)}</th>)}</tr></thead><tbody>{rows.map(u => <tr key={u.id}><td><div className="sv-user-cell"><span className="sv-avatar">{(u.fullName || u.username).charAt(0).toUpperCase()}</span><div><strong>{u.fullName || u.username}{u.id === user?.id && <span className="sv-you">{t('You')}</span>}</strong><small>@{u.username} · {u.email}</small></div></div></td><td><span className="sv-role-label"><Icon name={u.role === 'Admin' ? 'shield_person' : u.role === 'Designer' ? 'edit_note' : 'monitoring'} />{t(u.role)}</span></td><td><Status value={u.isActive ? 'active' : 'inactive'} /></td><td>{date(u.lastLoginAt)}</td><td><div className="sv-row-actions"><button className="sv-button sv-button-small" disabled={busy} onClick={() => void open('edit', u)}><Icon name="edit" />{t('Edit')}</button><button className="sv-button sv-button-small" disabled={busy || u.id === user?.id} onClick={() => void open('status', u)}>{t(u.isActive ? 'Deactivate' : 'Activate')}</button><button className="sv-button sv-button-small" disabled={busy || u.id === user?.id} onClick={() => void open('password', u)} title={u.id === user?.id ? t('Change your password from the Account menu') : undefined}><Icon name="key" />{t('Reset password')}</button></div></td></tr>)}</tbody></table></div>{!rows.length && <Empty title={t("No matching users")} description={t("Try another search or role filter.")} />}<div className="sv-users-pagination"><button className="sv-button" disabled={page <= 1} onClick={() => { setPage(p => p - 1); setLoading(true); }}>{t('Previous')}</button><span>{t('Page {page} of {pages}', { page, pages })}</span><button className="sv-button" disabled={page >= pages} onClick={() => { setPage(p => p + 1); setLoading(true); }}>{t('Next')}</button></div></>}
      </section>
      <p className="sv-table-note">{t('Deactivate an account to remove access. Username cannot be changed.')}</p>
    </>}
    {dialog && <Modal title={t(dialog.type === 'create' ? 'Create user' : dialog.type === 'edit' ? 'Edit account' : dialog.type === 'password' ? 'Reset password' : dialog.account?.isActive ? 'Deactivate account?' : 'Activate account?')} onClose={() => { if (!busy) setDialog(null); }} busy={busy}>
      {dialog.account && <p className="sv-modal-summary">{dialog.account.email} · @{dialog.account.username}</p>}
      <form className="sv-form" onSubmit={save}><fieldset className="sv-form sv-modal-fields" disabled={busy}>
        {['create', 'edit'].includes(dialog.type) && <><div className="sv-form-grid"><label>{t('Username')}<input required pattern="[a-zA-Z0-9_.-]{3,50}" minLength={3} maxLength={50} autoComplete="off" readOnly={dialog.type === 'edit'} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /><small role="alert">{fields.Username}</small></label><label>{t('Full name')}<input maxLength={100} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /><small role="alert">{fields.FullName}</small></label></div><label>{t('Email')}<input required type="email" maxLength={256} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /><small role="alert">{fields.Email}</small></label><div className="sv-form-grid"><label>{t('Role')}<select disabled={own} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{roles.map(r => <option key={r} value={r}>{t(r)}</option>)}</select><small role="alert">{fields.Role}</small></label>{dialog.type === 'edit' && <label>{t('Status')}<select disabled={own} value={String(form.isActive)} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}><option value="true">{t('Active')}</option><option value="false">{t('Inactive')}</option></select><small role="alert">{fields.IsActive}</small></label>}</div>{own && <small>{t('You cannot change your own role or deactivate your account.')}</small>}</>}
        {['create', 'password'].includes(dialog.type) && <><label>{t('New password')}<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small role="alert">{fields.Password || fields.NewPassword}</small></label><label>{t('Confirm new password')}<input required type="password" autoComplete="new-password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} /></label><small>{t('8–128 characters.')}</small></>}
        {dialog.type === 'password' && <p>{t('Resetting this password ends the account’s existing sessions.')}</p>}
        {dialog.type === 'status' && <p>{t(dialog.account?.isActive ? 'This account will lose access to the portal.' : 'This account will be able to sign in again.')}</p>}
        {modalError && <div className="sv-alert sv-alert-error" role="alert">{modalError}</div>}
        <div className="sv-modal-actions"><button type="button" className="sv-button" disabled={busy} onClick={() => setDialog(null)}>{t('Cancel')}</button><button className="sv-button sv-button-primary" disabled={busy}>{t(busy ? 'Saving…' : dialog.type === 'password' ? 'Reset password' : dialog.type === 'status' ? dialog.account?.isActive ? 'Deactivate' : 'Activate' : 'Save account')}</button></div>
      </fieldset></form>
    </Modal>}
  </div>;
}
