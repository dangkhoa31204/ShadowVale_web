import { useEffect, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '../../hooks/useAuth';
import { workspaceService } from './workspaceService';
import { WorkspaceContext, workspaceKey } from './workspaceContext';
import type { Command } from './types';
import { isDemoMode } from '../../config/environment';
import { DEMO_WORKSPACE_KEY } from '../../config/demo';
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(), queryClient = useQueryClient();
  // Admin reviews other people's work, so the queue refreshes when the window regains focus.
  const query = useQuery({ queryKey: workspaceKey, queryFn: workspaceService.load, refetchOnWindowFocus: user?.role === 'admin' });
  const mutation = useMutation({
    mutationFn: (command: Command) => { if (!user) throw new Error('Sign in to continue.'); return workspaceService.execute(command, user); },
    onSuccess: next => { queryClient.setQueryData(workspaceKey, next); toast.success('Workspace updated.'); },
    onError: e => { toast.error(e instanceof Error ? e.message : 'Could not save changes.'); },
  });
  useEffect(() => {
    if (!isDemoMode || user?.role !== 'admin') return;
    // Another tab changed the demo workspace stored in this browser.
    const onStorage = (event: StorageEvent) => { if (event.key === DEMO_WORKSPACE_KEY || event.key === null) void queryClient.invalidateQueries({ queryKey: workspaceKey }); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user?.role, queryClient]);
  const reload = async () => { await query.refetch(); };
  const error = query.error ? query.error.message || 'Could not load workspace.' : '';
  if (error && !query.data) return <div className="portal-state"><h2>Workspace unavailable</h2><p>{error}</p><Button variant="outline" onClick={() => void reload()}>Try again</Button></div>;
  if (!query.data) return <div className="portal-state flex items-center gap-2" role="status"><Spinner />Loading your workspace…</div>;
  return <WorkspaceContext.Provider value={{ state: query.data, busy: mutation.isPending, execute: mutation.mutateAsync, reload }}>{error && <div className="sv-alert sv-alert-error" role="alert">{error}<Button variant="outline" size="sm" onClick={() => void reload()}>Retry refresh</Button></div>}{children}</WorkspaceContext.Provider>;
}
