import { useTranslation } from '../preferences/preferencesContext';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { homeForRole } from './access';
export function AccessPage({ forbidden = false }: { forbidden?: boolean }) {
  const { user } = useAuth();
  const t = useTranslation();
  return <main className="portal portal-state"><span className="sv-eyebrow">{forbidden ? '403 / ACCESS DENIED' : '404 / PAGE NOT FOUND'}</span><h1>{forbidden ? t("This page requires a different role") : t("This page is unavailable")}</h1><p>{forbidden ? t("Your account can access the tools assigned to your role.") : t("Use the workspace navigation to continue.")}</p><Link className="sv-button sv-button-primary" to={user ? homeForRole(user.role) : '/login'}>{user ? t("Return to workspace") : t("Go to sign in")}</Link></main>;
}
