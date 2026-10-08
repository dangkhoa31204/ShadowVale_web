import type { LoginCredentials, RegisterPayload, AuthResponse, PasswordResetPayload } from '../../types/auth';
import type { Role, User } from '../../types/user';
import { storageService } from '../storage/storageService';
import { axiosClient } from '../api/axiosClient';
import { isDemoMode } from '../../config/environment';
import { DEMO_WORKSPACE_KEY } from '../../config/demo';

export const demoAccounts: { callsign: string; role: Role; name: string }[] = [
  { callsign: 'designer@shadowvale.dev', role: 'designer', name: 'Alex Designer' },
  { callsign: 'analyst@shadowvale.dev', role: 'analyst', name: 'Sam Analyst' },
  { callsign: 'admin@shadowvale.dev', role: 'admin', name: 'Jordan Admin' },
];
export const demoUser = (account: typeof demoAccounts[number]): User => ({
  id: account.role, callsign: account.name, email: account.callsign, role: account.role,
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
      response = (await axiosClient.post<AuthResponse>('/auth/login', {
        email: credentials.callsign, password: credentials.password,
      })).data;
      if (!response.token || !['designer', 'analyst', 'admin'].includes(response.user?.role)) {
        throw new Error('This account does not have access to the internal portal.');
      }
    }
    storageService.setAuth(response.token, response.user, credentials.rememberMe ?? false);
    return response;
  },
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    void payload;
    throw new Error('Internal accounts are provisioned by an administrator.');
  },
  resetPassword: async (payload: PasswordResetPayload): Promise<{ success: boolean; message: string }> => {
    if (isDemoMode) throw new Error('Password reset is unavailable in demo mode.');
    return (await axiosClient.post('/auth/reset-password', payload)).data;
  },
  logout: async (): Promise<void> => { storageService.clearAuth(); },
  getCurrentUser: async (): Promise<User | null> => {
    if (!storageService.getToken()) return null;
    if (isDemoMode) {
      const account = demoAccounts.find(a => `demo:${a.role}` === storageService.getToken());
      return account ? currentDemoUser(account) : null;
    }
    // Server validates signature, expiry and current role.
    const user = (await axiosClient.get<User>('/auth/me')).data;
    if (!user || typeof user.id !== 'string' || typeof user.callsign !== 'string' || !['designer', 'analyst', 'admin'].includes(user.role)) {
      throw new Error('This account does not have access to the internal portal.');
    }
    return user;
  },
};
