export type Role = 'designer' | 'analyst' | 'admin';

export interface User {
  id: string;
  username?: string;
  fullName?: string | null;
  callsign: string;
  email: string;
  role: Role;
  createdAt: string;
}
