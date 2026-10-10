import type { User } from '../../types/user';
import { createSessionPeers, type SessionMessage } from '../auth/sessionPeers';
export const SESSION_KEY = 'shadowvale_session_v2';
export const AUTH_CHANGED_EVENT = 'shadowvale:auth-changed';
export interface Session { sessionId?: string; generation?: number; token: string; refreshToken?: string; accessTokenExpiresAt?: string; refreshTokenExpiresAt?: string; user: User; remember: boolean }
export const storageService = {
  getSession(): Session | null {
    try {
      const value = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      const session = value ? JSON.parse(value) as Session : null;
      return session?.token && ['designer', 'analyst', 'admin'].includes(session.user?.role) ? session : null;
    } catch { return null; }
  },
  getToken(): string | null { return this.getSession()?.token || null; },
  getUser(): User | null { return this.getSession()?.user || null; },
  setSession(session: Session, broadcast = true) {
    session = { ...session, sessionId: session.sessionId ?? crypto.randomUUID(), generation: session.generation ?? 0 };
    const store = session.remember ? localStorage : sessionStorage;
    (session.remember ? sessionStorage : localStorage).removeItem(SESSION_KEY);
    store.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    if (broadcast && !session.remember) channel?.postMessage({ type: 'rotated', session } satisfies SessionMessage<Session>);
  },
  setAuth(token: string, user: User, remember = true) { this.setSession({ token, user, remember }); },
  clearAuth(notify = true, broadcast = true) {
    const current = this.getSession();
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(SESSION_KEY); store.removeItem('shadowvale_token'); store.removeItem('shadowvale_user');
    }
    if (notify) window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    if (broadcast && current?.sessionId && !current.remember) channel?.postMessage({ type: 'ended', sessionId: current.sessionId } satisfies SessionMessage<Session>);
  },
};
// No tokens are persisted outside the chosen storage; peer messages stay on this origin.
const channel = typeof document !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('shadowvale-session-rotation') : null;
const peers = channel ? createSessionPeers(
  () => storageService.getSession(), session => storageService.setSession(session, false),
  () => storageService.clearAuth(true, false), message => channel.postMessage(message),
) : null;
if (channel && peers) channel.onmessage = event => peers.receive(event.data);
export async function synchronizeSessionPeers() {
  if (typeof document !== 'undefined' && !storageService.getSession()?.remember && !peers)
    throw new Error('Session refresh requires BroadcastChannel support. Please sign in again in a supported browser.');
  await peers?.synchronize();
}
