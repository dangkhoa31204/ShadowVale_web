import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types/user';

interface ProtectedRouteProps {
  allowedRoles?: readonly Role[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-on-surface">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-data-mono text-xs text-primary tracking-widest uppercase animate-pulse">
          Validating your session…
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
