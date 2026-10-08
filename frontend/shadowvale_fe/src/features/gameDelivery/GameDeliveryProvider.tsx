import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useToast } from '../../components/ui/Toast';
import { gameDeliveryService } from './gameDeliveryService';
import { GameDeliveryContext } from './gameDeliveryContext';
import { isDemoMode } from '../../config/environment';
import type { DeliveryState, GameBuild } from './types';
const initial: DeliveryState = { builds: [], releases: [], active: {}, source_error: null };
export function GameDeliveryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const mounted = useRef(false), requestId = useRef(0), toast = useToast();
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try { const next = await gameDeliveryService.load(); if (mounted.current && id === requestId.current) { setState(next); setError(''); } }
    catch (e) { if (mounted.current && id === requestId.current) setError(e instanceof Error ? e.message : 'Cannot load game builds.'); }
    finally { if (mounted.current && id === requestId.current) setLoading(false); }
  }, []);
  useEffect(() => { mounted.current = true; const first = setTimeout(() => void refresh(), 0); const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30000); const visible = () => { if (!document.hidden) void refresh(); }; document.addEventListener('visibilitychange', visible); return () => { mounted.current = false; clearTimeout(first); clearInterval(timer); document.removeEventListener('visibilitychange', visible); }; }, [refresh]);
  async function mutate(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try { await action(); await refresh(); toast.success(message); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Game build update failed.'); throw e; }
    finally { if (mounted.current) setBusy(false); }
  }
  const review = (build: GameBuild, approve: boolean, note: string) => mutate(() => gameDeliveryService.review(build, approve, note), approve ? 'Game build approved.' : 'Game build returned.');
  const publish = (build: GameBuild, version: string, notes: string) => mutate(() => gameDeliveryService.publish(build, version, notes), isDemoMode ? 'Demo game version created.' : 'Game version published.');
  const resetDemo = () => mutate(() => gameDeliveryService.resetDemo(), 'Demo data reset.');
  return <GameDeliveryContext.Provider value={{ state, loading, busy, error, refresh, review, publish, resetDemo }}>{children}</GameDeliveryContext.Provider>;
}
