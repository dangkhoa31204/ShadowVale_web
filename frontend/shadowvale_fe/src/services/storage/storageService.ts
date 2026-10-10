import type { User } from '../../types/user';
const TOKEN_KEY = 'shadowvale_token';
const USER_KEY = 'shadowvale_user';
export const AUTH_CHANGED_EVENT = 'shadowvale:auth-changed';
export const storageService = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY),
  setAuth: (token: string, user: User, remember = true) => {
    storageService.clearAuth(false);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token); storage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser: (): User | null => {
    const value = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    try {
      const user = value ? JSON.parse(value) as User : null;
      return user && ['designer', 'analyst', 'admin'].includes(user.role) ? user : null;
    } catch { return null; }
  },
  clearAuth: (notify = true) => {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(TOKEN_KEY); storage.removeItem(USER_KEY);
    }
    if (notify) window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  },
};
