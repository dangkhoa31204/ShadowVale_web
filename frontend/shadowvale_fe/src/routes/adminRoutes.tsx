import type { RouteObject } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { UsersPage } from '../pages/admin/Users/UsersPage';
import { UserDetailsPage } from '../pages/admin/UserDetails/UserDetailsPage';

export const adminRoutes: RouteObject = {
  element: <AdminLayout />,
  children: [
    { path: '/admin/users', element: <UsersPage /> },
    { path: '/admin/users/:id', element: <UserDetailsPage /> },
  ],
};
