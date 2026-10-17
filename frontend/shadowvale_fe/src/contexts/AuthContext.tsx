import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { queryClient } from '../lib/queryClient';
import type { User } from '../types/user';
import type { LoginCredentials } from '../types/auth';
import { authService } from '../services/auth/authService';
import { storageService, AUTH_CHANGED_EVENT, SESSION_KEY } from '../services/storage/storageService';
import { statusOf } from '../services/api/errors';
import { AuthContext } from './authContextValue';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const currentAccount = useRef<User | null>(null);
  const applyUser = useCallback((next: User | null) => {
    // Clear the previous account before its replacement mounts server queries.
    // Clearing in an effect after setUser cancels the new workspace load on reload.
    if (currentAccount.current?.id !== next?.id || currentAccount.current?.role !== next?.role) queryClient.clear();
    currentAccount.current = next;
    setUser(next);
  }, []);
  useEffect(() => {
    let active = true;
    authService.getCurrentUser().then(user => {
      if (active) { applyUser(user); if (!user) storageService.clearAuth(false); }
    }).catch(error => {
      if (active) { setSessionError('Could not validate your session. Retry signing in when the API is available.'); if (statusOf(error) === 401) storageService.clearAuth(false); }
    }).finally(() => { if (active) setIsLoading(false); });
    const clear = () => applyUser(storageService.getUser());
    const sync = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) clear();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, clear); window.addEventListener('storage', sync);
    return () => {
      active = false; window.removeEventListener(AUTH_CHANGED_EVENT, clear); window.removeEventListener('storage', sync);
    };
  }, [applyUser]);
  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setSessionError(''); applyUser(response.user); return response.user;
  };
  const logout = async () => { await authService.logout(); applyUser(null); };
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, sessionError, login, logout }}>{children}</AuthContext.Provider>;
};
