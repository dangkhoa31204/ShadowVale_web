import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const mainNav = [
    { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Assets', to: '/admin/assets', icon: 'inventory_2' },
    { label: 'Entity Editor', to: '/admin/entity-editor', icon: 'precision_manufacturing' },
    { label: 'Live Ops', to: '/admin/live-ops', icon: 'sensors' },
    { label: 'Analytics', to: '/admin/analytics', icon: 'monitoring' },
    { label: 'Users', to: '/admin/users', icon: 'manage_accounts' },
  ];

  const systemNav = [
    { label: 'Role Matrix', to: '/admin/roles', icon: 'settings_accessibility' },
    { label: 'System Topology', to: '/admin/system', icon: 'settings_suggest' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      <nav
        className={`fixed left-0 top-0 h-full w-[260px] border-r border-border-subtle bg-surface flex flex-col p-stack-md gap-stack-sm z-40 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="mb-stack-lg px-2 pt-2 flex items-start justify-between">
          <div>
            <h2 className="font-title-sm text-title-sm text-on-surface">Command Center</h2>
            <div className="flex items-center gap-2 mt-1 opacity-70">
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                System Administrator
              </span>
            </div>
            <div className="mt-3 font-data-mono text-[11px] text-primary">
              V0.4.2-STABLE // ONLINE
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-on-surface-variant hover:text-on-surface p-1 rounded"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Section: Core Navigation */}
        <div className="text-[10px] font-label-caps uppercase text-on-surface-variant/60 px-3 mb-1">
          Tactical Modules
        </div>
        <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {mainNav.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to === '/admin/dashboard' && location.pathname === '/admin');
            return (
              <Link
                key={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-label-caps text-label-caps transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
                to={item.to}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}

          <div className="text-[10px] font-label-caps uppercase text-on-surface-variant/60 px-3 mt-4 mb-1">
            Governance & Ops
          </div>
          {systemNav.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-label-caps text-label-caps transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
                to={item.to}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-border-subtle">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 font-label-caps text-label-caps"
          >
            <span className="material-symbols-outlined text-[18px]">account_circle</span>
            Operative Profile
          </Link>
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 font-label-caps text-label-caps"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Public Portal
          </Link>
        </div>
      </nav>
    </>
  );
};
