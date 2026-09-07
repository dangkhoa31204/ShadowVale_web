import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { DashboardPage } from '../pages/admin/Dashboard/DashboardPage';
import { AnalyticsPage } from '../pages/admin/Analytics/AnalyticsPage';
import { LiveOpsPage } from '../pages/admin/LiveOps/LiveOpsPage';
import { EntityEditorPage } from '../pages/admin/EntityEditor/EntityEditorPage';
import { AssetsManagerPage } from '../pages/admin/Assets/AssetsManagerPage';
import { UsersPage } from '../pages/admin/Users/UsersPage';
import { UserDetailsPage } from '../pages/admin/UserDetails/UserDetailsPage';
import { RoleManagementPage } from '../pages/admin/RoleManagement/RoleManagementPage';
import { SystemArchitecturePage } from '../pages/admin/SystemArchitecture/SystemArchitecturePage';

export const adminRoutes: RouteObject = {
  element: (
    <ProtectedRoute allowedRoles={['admin', 'commander']}>
      <AdminLayout />
    </ProtectedRoute>
  ),
  children: [
    { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
    { path: '/admin/dashboard', element: <DashboardPage /> },
    { path: '/admin/assets', element: <AssetsManagerPage /> },
    { path: '/admin/entity-editor', element: <EntityEditorPage /> },
    { path: '/admin/live-ops', element: <LiveOpsPage /> },
    { path: '/admin/analytics', element: <AnalyticsPage /> },
    { path: '/admin/roles', element: <RoleManagementPage /> },
    { path: '/admin/users', element: <UsersPage /> },
    { path: '/admin/users/:id', element: <UserDetailsPage /> },
    { path: '/admin/system', element: <SystemArchitecturePage /> },
  ],
};

