import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types/user';
import type { LoginCredentials, RegisterPayload } from '../types/auth';
import { authService } from '../services/auth/authService';
import { storageService, AUTH_CHANGED_EVENT } from '../services/storage/storageService';
import { AuthContext } from './authContextValue';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    let active = true;
    authService.getCurrentUser().then(user => {
      if (active) { setUser(user); if (!user) storageService.clearAuth(false); }
    }).catch(() => {
      if (active) { setSessionError('Could not validate your session. Please sign in again.'); storageService.clearAuth(false); }
    }).finally(() => { if (active) setIsLoading(false); });
    const clear = () => setUser(null);
    const sync = (event: StorageEvent) => {
      if ((event.key === 'shadowvale_token' || event.key === null) && !storageService.getToken()) clear();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, clear); window.addEventListener('storage', sync);
    return () => {
      active = false; window.removeEventListener(AUTH_CHANGED_EVENT, clear); window.removeEventListener('storage', sync);
    };
  }, []);
  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setSessionError(''); setUser(response.user); return response.user;
  };
  const register = async (payload: RegisterPayload) => (await authService.register(payload)).user;
  const logout = async () => { await authService.logout(); setUser(null); };
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, sessionError, login, register, logout }}>{children}</AuthContext.Provider>;
};
