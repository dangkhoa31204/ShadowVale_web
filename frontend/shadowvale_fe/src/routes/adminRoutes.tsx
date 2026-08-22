import type { RouteObject } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { UsersPage } from '../pages/admin/Users/UsersPage';
import { UserDetailsPage } from '../pages/admin/UserDetails/UserDetailsPage';
import { RoleManagementPage } from '../pages/admin/RoleManagement/RoleManagementPage';
import { SystemArchitecturePage } from '../pages/admin/SystemArchitecture/SystemArchitecturePage';

export const adminRoutes: RouteObject = {
  element: <AdminLayout />,
  children: [
    { path: '/admin/roles', element: <RoleManagementPage /> },
    { path: '/admin/users', element: <UsersPage /> },
    { path: '/admin/users/:id', element: <UserDetailsPage /> },
    { path: '/admin/system', element: <SystemArchitecturePage /> },
  ],
};
