import type { LoginCredentials, RegisterPayload, AuthResponse, PasswordResetPayload } from '../../types/auth';
import type { Role, User } from '../../types/user';
import { storageService } from '../storage/storageService';
import { axiosClient, authClient, withSessionLock } from '../api/axiosClient';
import type { AuthResponse as ApiAuthResponse, UserDto } from '../api/contracts';
import { userFromApi } from './userAdapter';
import { isDemoMode } from '../../config/environment';
import { DEMO_WORKSPACE_KEY } from '../../config/demo';

export const demoAccounts: { callsign: string; role: Role; name: string }[] = [
  { callsign: 'designer@shadowvale.dev', role: 'designer', name: 'Alex Designer' },
  { callsign: 'analyst@shadowvale.dev', role: 'analyst', name: 'Sam Analyst' },
  { callsign: 'admin@shadowvale.dev', role: 'admin', name: 'Jordan Admin' },
];
export const demoUser = (account: typeof demoAccounts[number]): User => ({
  id: account.role, username: account.role, fullName: account.name, callsign: account.name, email: account.callsign, role: account.role,
  tier: 'Internal team', clearanceLevel: account.role, createdAt: '2026-09-18T00:00:00Z',
});
function currentDemoUser(account: typeof demoAccounts[number]): User | null {
  const stored = localStorage.getItem(DEMO_WORKSPACE_KEY);
  if (!stored) return demoUser(account);
  const directory = JSON.parse(stored) as { users: (User & { active: boolean })[] };
  const user = directory.users.find(u => u.id === account.role);
  return user?.active && ['designer', 'analyst', 'admin'].includes(user.role) ? user : null;
}
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    let response: AuthResponse;
    if (isDemoMode) {
      const account = demoAccounts.find(a => a.callsign === credentials.callsign.toLowerCase());
      if (!account || credentials.password !== 'ShadowVale123!') throw new Error('Incorrect demo email or password.');
      // Intentionally not a JWT: demo authorization never represents server security.
      const user = currentDemoUser(account);
      if (!user) throw new Error('This demo account has been removed or deactivated.');
      response = { token: `demo:${account.role}`, user };
    } else {
      const data = (await authClient.post<ApiAuthResponse>('/auth/login', { usernameOrEmail: credentials.callsign, password: credentials.password })).data;
      response = { token: data.accessToken, user: userFromApi(data.user) };
      storageService.setSession({ token: data.accessToken, refreshToken: data.refreshToken, accessTokenExpiresAt: data.accessTokenExpiresAt, refreshTokenExpiresAt: data.refreshTokenExpiresAt, user: response.user, remember: credentials.rememberMe ?? false });
      return response;
    }
    storageService.setAuth(response.token, response.user, credentials.rememberMe ?? false);
    return response;
  },
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    void payload;
    throw new Error('Internal accounts are provisioned by an administrator.');
  },
  resetPassword: async (payload: PasswordResetPayload): Promise<{ success: boolean; message: string }> => {
    void payload;
    throw new Error('Password recovery has no backend API. Contact your administrator.');
  },
  logout: async (): Promise<void> => {
    try { await withSessionLock(async () => {
      try { const session = storageService.getSession(); if (!isDemoMode && session?.refreshToken) await authClient.post('/auth/logout', { refreshToken: session.refreshToken }); }
      finally { storageService.clearAuth(); }
    }); } finally { storageService.clearAuth(); }
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    if (isDemoMode) throw new Error('Password changes are unavailable in demo mode.');
    await axiosClient.put('/auth/me/password', { currentPassword, newPassword }); storageService.clearAuth();
  },
  getCurrentUser: async (): Promise<User | null> => {
    if (!storageService.getToken()) return null;
    if (isDemoMode) {
      const account = demoAccounts.find(a => `demo:${a.role}` === storageService.getToken());
      return account ? currentDemoUser(account) : null;
    }
    // Server validates signature, expiry and current role.
    return userFromApi((await axiosClient.get<UserDto>('/auth/me')).data);
  },
};
