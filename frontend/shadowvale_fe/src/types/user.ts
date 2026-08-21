export interface User {
  id: string;
  callsign: string;
  email: string;
  role: 'operative' | 'admin' | 'commander';
  tier: string;
  clearanceLevel: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
