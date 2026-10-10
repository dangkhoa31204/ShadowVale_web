import axios, { type InternalAxiosRequestConfig } from 'axios';
import { storageService, synchronizeSessionPeers } from '../storage/storageService';
import { apiBaseURL } from '../../config/environment';
import type { AuthResponse } from './contracts';
import { userFromApi } from '../auth/userAdapter';
import { createRefreshCoordinator } from '../auth/refreshCoordinator';
import { errorMessage, statusOf } from './errors';
export const authClient = axios.create({ baseURL: apiBaseURL, timeout: 15000 });
authClient.interceptors.response.use(response => response, error => { error.message = errorMessage(error); return Promise.reject(error); });
export const axiosClient = axios.create({ baseURL: apiBaseURL, timeout: 30000 });
let localLock = Promise.resolve();
export async function withSessionLock<R>(job: () => Promise<R>): Promise<R> {
  if (navigator.locks) return navigator.locks.request('shadowvale-auth-refresh', async () => { await synchronizeSessionPeers(); return job(); });
  if (typeof document !== 'undefined') throw new Error('Session refresh requires Web Locks support. Please sign in again in a supported browser.');
  if (storageService.getSession()?.remember) throw new Error('Shared session refresh requires Web Locks support. Please sign in again in a supported browser.');
  const previous = localLock; let unlock!: () => void;
  localLock = new Promise<void>(resolve => { unlock = resolve; });
  await previous; try { return await job(); } finally { unlock(); }
}
export const refreshSession = createRefreshCoordinator(
  () => storageService.getSession(), session => storageService.setSession(session),
  async session => {
    const { data } = await authClient.post<AuthResponse>('/auth/refresh', { refreshToken: session.refreshToken });
    return { sessionId: session.sessionId, generation: (session.generation ?? 0) + 1, token: data.accessToken, refreshToken: data.refreshToken, accessTokenExpiresAt: data.accessTokenExpiresAt, refreshTokenExpiresAt: data.refreshTokenExpiresAt, user: userFromApi(data.user), remember: session.remember };
  },
  withSessionLock,
);
type Request = InternalAxiosRequestConfig & { retried?: boolean; sessionToken?: string; sessionUserId?: string };
axiosClient.interceptors.request.use((config: Request) => {
  const token = storageService.getToken(); config.sessionToken = token || ''; config.sessionUserId = storageService.getUser()?.id;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});
axiosClient.interceptors.response.use(response => response, async error => {
  const request = error.config as Request | undefined;
  if (statusOf(error) === 401 && request && !request.retried && request.sessionToken) {
    request.retried = true;
    try { const session = await refreshSession(request.sessionToken); if (session.user.id !== request.sessionUserId) throw new Error('The signed-in account changed. Reload this page.'); return await axiosClient(request); }
    catch (refreshError) {
      if (statusOf(refreshError) === 401 || !storageService.getSession()?.refreshToken) storageService.clearAuth();
      throw refreshError;
    }
  }
  if (statusOf(error) === 401 && request?.retried) storageService.clearAuth();
  error.message = errorMessage(error); throw error;
});
