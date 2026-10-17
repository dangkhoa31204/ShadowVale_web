import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { homeForRole } from './access';
export function AccessPage({ forbidden = false }: { forbidden?: boolean }) {
  const { user } = useAuth();
  return <main className="portal portal-state grid content-center justify-items-start gap-3"><span className="sv-eyebrow">{forbidden ? '403 / ACCESS DENIED' : '404 / PAGE NOT FOUND'}</span><h1>{forbidden ? "This page requires a different role" : "This page is unavailable"}</h1><p className="text-muted-foreground">{forbidden ? "Your account can access the tools assigned to your role." : "Use the workspace navigation to continue."}</p><Button asChild><Link to={user ? homeForRole(user.role) : '/login'}>{user ? "Return to workspace" : "Go to sign in"}</Link></Button></main>;
}
