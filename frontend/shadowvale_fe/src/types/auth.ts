import type { User } from './user';

export interface LoginCredentials {
  callsign: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
