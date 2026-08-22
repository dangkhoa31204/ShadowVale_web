import React from 'react';
import { Link } from 'react-router-dom';

export const AdminHeader: React.FC = () => {
  return (
    <header className="w-full h-16 border-b border-border-subtle bg-surface-container-lowest flex items-center justify-between px-gutter flex-shrink-0 z-10">
      <div className="flex items-center gap-8">
        <h1 className="font-display-lg text-display-lg font-bold text-primary tracking-tight">ShadowVale</h1>
        <nav className="hidden md:flex gap-6">
          <Link className="text-on-surface-variant font-medium pb-[19px] pt-5 hover:text-primary transition-colors duration-200 text-body-md border-b-2 border-transparent" to="#">Content</Link>
          <Link className="text-on-surface-variant font-medium pb-[19px] pt-5 hover:text-primary transition-colors duration-200 text-body-md border-b-2 border-transparent" to="#">Balancing</Link>
          <Link className="text-on-surface-variant font-medium pb-[19px] pt-5 hover:text-primary transition-colors duration-200 text-body-md border-b-2 border-transparent" to="#">Telemetry</Link>
          <Link className="text-on-surface-variant font-medium pb-[19px] pt-5 hover:text-primary transition-colors duration-200 text-body-md border-b-2 border-transparent" to="#">Logistics</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors border border-outline-variant px-3 py-1.5 rounded">
          System Status
        </button>
        <button className="font-label-caps text-label-caps bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors px-4 py-1.5 rounded flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
          Deploy Build
        </button>
      </div>
    </header>
  );
};
