import type { Role } from '../../types/user';
export const permissions = {
  author: ['designer'], review: ['admin'], publish: ['admin'],
  analytics: ['designer', 'analyst', 'admin'], solverEdit: ['analyst', 'admin'], users: ['admin'],
  versions: ['designer', 'admin'],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof permissions;
export const can = (role: Role, permission: Permission) =>
  (permissions[permission] as readonly Role[]).includes(role);
export const homeForRole = (role: Role) => role === 'analyst' ? '/admin/analytics' : role === 'admin' ? '/admin/reviews' : '/admin/content';
export const safeRedirect = (value: string | null, role: Role) => {
  const pathname = value?.split(/[?#]/, 1)[0];
  const routes = [...navigationForRole(role), { path: '/admin/change-password' }, ...(can(role, 'analytics') ? [{ path: '/admin/analytics' }] : [])];
  return value && !value.includes('\\') && routes.some(n => pathname === n.path || pathname?.startsWith(n.path + '/')) ? value : homeForRole(role);
};
export const navigation: { label: string; path: string; icon: string; permission?: Permission; group: string }[] = [
  { label: 'Content authoring', path: '/admin/content', icon: 'edit_note', permission: 'author', group: 'Workspace' },
  { label: 'Review content', path: '/admin/reviews', icon: 'fact_check', permission: 'review', group: 'Workspace' },
  { label: 'Versions', path: '/admin/releases', icon: 'deployed_code', permission: 'versions', group: 'Workspace' },
  { label: 'Users', path: '/admin/users', icon: 'group', permission: 'users', group: 'Workspace' },
  { label: 'Analytics', path: '/admin/analytics', icon: 'monitoring', permission: 'analytics', group: 'Insights' },
];
export const navigationForRole = (role: Role) => navigation
  .filter(n => !n.permission || can(role, n.permission))
  .filter(n => !(role === 'admin' && n.path === '/admin/analytics'))
  .map(n => ({ ...n, label: n.path === '/admin/releases' && role === 'admin' ? 'Publish versions' : n.label }));
