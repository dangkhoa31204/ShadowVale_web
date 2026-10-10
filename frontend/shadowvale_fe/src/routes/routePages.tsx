import { lazy } from 'react';
export const Dashboard = lazy(() => import('../features/dashboard/DashboardPage').then(m => ({ default: m.InternalDashboardPage })));
export const Content = lazy(() => import('../features/content/ContentPage').then(m => ({ default: m.ContentPage })));
export const ChangeReports = lazy(() => import('../features/changeReports/ChangeReportsPage').then(m => ({ default: m.ChangeReportsPage })));
export const Reviews = lazy(() => import('../features/releases/ReviewsPage').then(m => ({ default: m.ReviewsPage })));
export const Releases = lazy(() => import('../features/releases/ReleasesPage').then(m => ({ default: m.ReleasesPage })));
export const Analytics = lazy(() => import('../features/analytics/AnalyticsPage').then(m => ({ default: m.InternalAnalyticsPage })));

export const Users = lazy(() => import('../features/administration/UsersPage').then(m => ({ default: m.InternalUsersPage })));
export const Profile = lazy(() => import('../features/auth/ProfilePage').then(m => ({ default: m.ProfilePage })));
export const ChangePassword = lazy(() => import('../features/auth/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));
