import type { UserDto } from '../api/contracts';
import type { Role, User } from '../../types/user';
export function userFromApi(dto: UserDto): User {
  const role = dto.role.toLowerCase() as Role;
  if (!dto.isActive || !['admin', 'designer', 'analyst'].includes(role)) throw new Error('This account cannot access the portal.');
  return { id: dto.id, username: dto.username, fullName: dto.fullName, callsign: dto.fullName?.trim() || dto.username, email: dto.email, role, tier: 'Internal team', clearanceLevel: role, createdAt: dto.createdAt };
}
