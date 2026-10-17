import { createContext } from 'react';
import type { User } from '../types/user';
import type { LoginCredentials } from '../types/auth';
export interface AuthContextType {
  user: User | null; isAuthenticated: boolean; isLoading: boolean; sessionError: string;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
