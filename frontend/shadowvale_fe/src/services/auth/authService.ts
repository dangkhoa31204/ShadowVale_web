import type { LoginCredentials, RegisterPayload, AuthResponse, PasswordResetPayload } from '../../types/auth';
import { storageService } from '../storage/storageService';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Simulated API call - replace with axiosClient.post('/auth/login', credentials) when endpoint is ready
    await new Promise((res) => setTimeout(res, 1200));

    const mockResponse: AuthResponse = {
      token: `sv_jwt_${Date.now()}`,
      user: {
        id: `usr_${Math.floor(Math.random() * 10000)}`,
        callsign: credentials.callsign,
        email: `${credentials.callsign.toLowerCase()}@shadowvale.io`,
        role: credentials.callsign.toUpperCase().includes('ADMIN') ? 'admin' : 'operative',
        tier: 'Standard Operative',
        clearanceLevel: 'CL-2',
        createdAt: new Date().toISOString(),
      },
    };

    storageService.setAuth(mockResponse.token, mockResponse.user, credentials.rememberMe ?? true);
    return mockResponse;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    // Simulated API call - replace with axiosClient.post('/auth/register', payload) when endpoint is ready
    await new Promise((res) => setTimeout(res, 1500));

    const mockResponse: AuthResponse = {
      token: `sv_jwt_${Date.now()}`,
      user: {
        id: `usr_${Math.floor(Math.random() * 10000)}`,
        callsign: payload.username,
        email: payload.email,
        role: 'operative',
        tier: 'Standard Operative',
        clearanceLevel: 'CL-2',
        createdAt: new Date().toISOString(),
      },
    };

    storageService.setAuth(mockResponse.token, mockResponse.user, true);
    return mockResponse;
  },

  resetPassword: async (payload: PasswordResetPayload): Promise<{ success: boolean; message: string }> => {
    // Simulated API call - replace with axiosClient.post('/auth/reset-password', payload)
    await new Promise((res) => setTimeout(res, 1000));
    return { success: true, message: `Dispatch code sent to ${payload.email}` };
  },

  logout: async (): Promise<void> => {
    storageService.clearAuth();
  },

  getCurrentUser: () => {
    return storageService.getUser();
  },
};
