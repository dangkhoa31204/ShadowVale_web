import type { RouteObject } from 'react-router-dom';
import { CommonLayout } from '../layouts/CommonLayout';
import { HomePage } from '../pages/common/Home/HomePage';
import { LoginPage } from '../pages/common/Login/LoginPage';
import { RegisterPage } from '../pages/common/Register/RegisterPage';
import { ResetPasswordPage } from '../pages/common/ResetPassword/ResetPasswordPage';
import { AuthorizationPage } from '../pages/common/Authorization/AuthorizationPage';
import { ProfilePage } from '../pages/common/Profile/ProfilePage';
import { ChangePasswordPage } from '../pages/common/ChangePassword/ChangePasswordPage';

export const commonRoutes: RouteObject = {
  element: <CommonLayout />,
  children: [
    { path: '/', element: <HomePage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
    { path: '/authorization', element: <AuthorizationPage /> },
    { path: '/profile', element: <ProfilePage /> },
    { path: '/change-password', element: <ChangePasswordPage /> },
  ],
};
