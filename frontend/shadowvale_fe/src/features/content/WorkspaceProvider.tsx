import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { workspaceService } from './workspaceService';
import { WorkspaceContext } from './workspaceContext';
import type { Command, Workspace } from './types';
import { isDemoMode } from '../../config/environment';
import { DEMO_WORKSPACE_KEY } from '../../config/demo';
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(), toast = useToast();
  const [state, setState] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    setError('');
    try { setState(await workspaceService.load()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load workspace.'); }
  }, []);
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const onStorage = (event: StorageEvent) => {
      if (!busy && isDemoMode && (event.key === DEMO_WORKSPACE_KEY || event.key === null)) void reload();
    };
    const onFocus = () => { if (!busy) void reload(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', onFocus); };
  }, [user?.role, busy, reload]);
  useEffect(() => {
    let active = true;
    workspaceService.load().then(value => { if (active) setState(value); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load workspace.'); });
    return () => { active = false; };
  }, []);
  async function execute(command: Command) {
    if (!user) throw new Error('Sign in to continue.');
    setBusy(true);
    try {
      const next = await workspaceService.execute(command, user); setState(next);
      toast.success('Workspace updated.'); return next;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save changes.'); throw e;
    } finally { setBusy(false); }
  }
  if (error) return <div className="portal-state"><h2>Workspace unavailable</h2><p>{error}</p><button className="sv-button" onClick={reload}>Try again</button></div>;
  if (!state) return <div className="portal-state" role="status">Loading your workspace…</div>;
  return <WorkspaceContext.Provider value={{ state, busy, execute, reload }}>{children}</WorkspaceContext.Provider>;
}
