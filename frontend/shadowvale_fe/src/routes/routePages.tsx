import { lazy } from 'react';
export const Content = lazy(() => import('../features/content/ContentManagementPage').then(m => ({ default: m.ContentManagementPage })));
export const Reviews = lazy(() => import('../features/releases/ReviewsPage').then(m => ({ default: m.ReviewsPage })));
export const Releases = lazy(() => import('../features/releases/ReleasesPage').then(m => ({ default: m.ReleasesPage })));
export const Analytics = lazy(() => import('../features/analytics/AnalyticsPage').then(m => ({ default: m.InternalAnalyticsPage })));

export const Users = lazy(() => import('../features/administration/UsersPage').then(m => ({ default: m.InternalUsersPage })));
export const ChangePassword = lazy(() => import('../features/auth/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));
