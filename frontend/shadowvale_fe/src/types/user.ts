export type Role = 'designer' | 'analyst' | 'admin';

export interface User {
  id: string;
  username?: string;
  fullName?: string | null;
  callsign: string;
  email: string;
  role: Role;
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
