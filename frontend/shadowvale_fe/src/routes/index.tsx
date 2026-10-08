import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { commonRoutes } from './commonRoutes';
import { adminRoutes } from './adminRoutes';
const router = createBrowserRouter([adminRoutes, commonRoutes]);
export const AppRoutes = () => <Suspense fallback={<div className="portal-state" role="status">Loading workspace…</div>}><RouterProvider router={router} /></Suspense>;
