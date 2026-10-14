import type { User } from './user';

export interface LoginCredentials {
  callsign: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
