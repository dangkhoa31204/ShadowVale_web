import { Navigate, type RouteObject } from 'react-router-dom';
import { InternalLoginPage } from '../features/auth/LoginPage';
import { AccessPage } from '../features/auth/AccessPage';
export const commonRoutes: RouteObject = {
  children: [
    { path: '/', element: <Navigate to="/admin" replace /> },
    { path: '/login', element: <InternalLoginPage /> },
    { path: '/forbidden', element: <AccessPage forbidden /> },
    { path: '/authorization', element: <Navigate to="/forbidden" replace /> },
    { path: '*', element: <AccessPage /> },
  ],
};
