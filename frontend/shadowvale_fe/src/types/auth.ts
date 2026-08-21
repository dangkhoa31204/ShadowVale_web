import type { User } from './user';

export interface LoginCredentials {
  callsign: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PasswordResetPayload {
  email: string;
}
