import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { success } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const handleDeploy = () => {
    success('Build v0.4.2-STABLE staged to global edge nodes.');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Content', to: '/admin/assets' },
    { label: 'Balancing', to: '/admin/entity-editor' },
    { label: 'Telemetry', to: '/admin/analytics' },
    { label: 'Logistics', to: '/admin/live-ops' },
  ];

  return (
    <header className="w-full h-16 border-b border-border-subtle bg-surface-container-lowest flex items-center justify-between px-4 sm:px-gutter flex-shrink-0 z-10">
      <div className="flex items-center gap-4 sm:gap-8">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-on-surface-variant hover:text-on-surface p-1 rounded"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <Link to="/admin/dashboard" className="font-display-lg text-lg sm:text-display-lg font-bold text-primary tracking-tight">
          ShadowVale
        </Link>

        <nav className="hidden md:flex gap-6">
          {navLinks.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                className={`font-medium pb-[19px] pt-5 transition-colors duration-200 text-body-md border-b-2 ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-on-surface-variant border-transparent hover:text-primary'
                }`}
                to={item.to}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          to="/admin/system"
          className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors border border-outline-variant px-2.5 sm:px-3 py-1.5 rounded hidden sm:inline-block"
        >
          System Status
        </Link>

        <button
          onClick={handleDeploy}
          className="font-label-caps text-label-caps bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors px-3 sm:px-4 py-1.5 rounded flex items-center gap-1.5 sm:gap-2 text-xs"
        >
          <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
          <span className="hidden sm:inline">Deploy Build</span>
          <span className="sm:hidden">Deploy</span>
        </button>

        {/* User profile dropdown/badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
          <Link
            to="/profile"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Profile Dossier"
          >
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center font-data-mono text-xs text-primary font-bold">
              {user?.callsign ? user.callsign.substring(0, 2).toUpperCase() : 'OP'}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-on-surface-variant hover:text-error p-1 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
