import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { commonRoutes } from './commonRoutes';
import { adminRoutes } from './adminRoutes';
import { useTranslation } from '../features/preferences/preferencesContext';
const router = createBrowserRouter([adminRoutes, commonRoutes]);
export function AppRoutes() {
  const t = useTranslation();
  return <Suspense fallback={<div className="portal-state" role="status">{t('Loading workspace…')}</div>}><RouterProvider router={router} /></Suspense>;
}
