import React from 'react';
import { Link } from 'react-router-dom';

export const AdminSidebar: React.FC = () => {
  return (
    <nav className="fixed left-0 top-0 h-full w-[260px] border-r border-border-subtle bg-surface flex flex-col p-stack-md gap-stack-sm z-20">
      {/* Header */}
      <div className="mb-stack-lg px-2 pt-2">
        <h2 className="font-title-sm text-title-sm text-on-surface">Command Center</h2>
        <div className="flex items-center gap-2 mt-1 opacity-70">
          <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant">System Administrator</span>
        </div>
        <div className="mt-4 font-data-mono text-data-mono text-primary-container">
          V0.4.2-STABLE
        </div>
      </div>
      
      {/* Main Tabs */}
      <div className="flex flex-col gap-1 flex-1">
        <Link className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 font-label-caps text-label-caps" to="#">
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          Dashboard
        </Link>
        <Link className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 font-label-caps text-label-caps" to="#">
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          Assets
        </Link>
        <Link className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 font-label-caps text-label-caps" to="#">
          <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
          Entity Editor
        </Link>
        <Link className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 font-label-caps text-label-caps" to="#">
          <span className="material-symbols-outlined text-[18px]">sensors</span>
          Live Ops
        </Link>
        <Link className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 font-label-caps text-label-caps" to="#">
          <span className="material-symbols-outlined text-[18px]">monitoring</span>
          Analytics
        </Link>
      </div>
      
      {/* Footer Tabs */}
      <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-border-subtle">
        <button className="w-full text-left flex items-center justify-center gap-2 px-3 py-2 mb-4 rounded border border-outline-variant hover:border-primary text-primary font-label-caps text-label-caps transition-colors">
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Instance
        </button>
        <Link className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-caps text-label-caps" to="/admin/roles">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
          Settings
        </Link>
        <Link className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 font-label-caps text-label-caps" to="#">
          <span className="material-symbols-outlined text-[18px]">help_center</span>
          Support
        </Link>
      </div>
    </nav>
  );
};
