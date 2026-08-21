import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border-subtle p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <span className="material-symbols-outlined text-tertiary text-2xl">admin_panel_settings</span>
            <span className="font-display-lg text-lg font-bold text-tertiary tracking-tight">ADMIN CONTROL</span>
          </div>

          <nav className="flex flex-col gap-2 font-data-mono text-xs">
            <Link to="/admin/users" className="px-3 py-2 rounded bg-surface-container text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">group</span>
              USERS MANAGEMENT
            </Link>
          </nav>
        </div>

        <div className="pt-4 border-t border-border-subtle flex flex-col gap-3">
          <div className="font-data-mono text-xs text-on-surface-variant">
            <p className="text-on-surface font-bold">{user?.callsign || 'ADMIN'}</p>
            <p className="text-[10px] text-tertiary">{user?.clearanceLevel || 'CL-2 ADMIN'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-error-container/30 hover:bg-error-container text-error text-xs font-data-mono py-2 rounded border border-error/40 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-tactical-grid overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
