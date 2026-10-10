import { Navigate, type RouteObject } from 'react-router-dom';
import { InternalLayout } from '../layouts/InternalLayout';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { permissions, type Permission } from '../features/auth/access';
import { HomeRedirect } from '../features/auth/RoleHome';
import { Dashboard, Content, ChangeReports, Reviews, Releases, Analytics } from './routePages';
function guard(permission: Permission, element: React.ReactNode) {
  return <ProtectedRoute allowedRoles={permissions[permission]}>{element}</ProtectedRoute>;
}
export const adminRoutes: RouteObject = {
  path: '/admin',
  element: <ProtectedRoute><InternalLayout /></ProtectedRoute>,
  children: [
    { index: true, element: <HomeRedirect /> },
    { path: 'dashboard', element: guard('overview', <Dashboard />) },
    { path: 'content', element: guard('author', <Content />) },
    { path: 'content/:draftId', element: guard('author', <Content />) },
    { path: 'change-reports', element: guard('author', <ChangeReports />) },
    { path: 'change-reports/:draftId', element: guard('author', <ChangeReports />) },
    { path: 'reviews', element: guard('review', <Reviews />) },
    { path: 'releases', element: guard('versions', <Releases />) },
    { path: 'analytics', element: guard('analytics', <Analytics />) },
    { path: 'assets', element: <Navigate to="/admin/content" replace /> },
    { path: 'entity-editor', element: <Navigate to="/admin/content" replace /> },
  ],
};
