import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { homeForRole } from './access';
export function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />;
}
