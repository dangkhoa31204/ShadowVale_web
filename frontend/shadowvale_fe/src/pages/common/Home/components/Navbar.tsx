import React from 'react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-surface-container-lowest w-full h-16 border-b border-border-subtle sticky top-0 z-50">
      <div className="flex items-center justify-between px-gutter w-full max-w-container-max mx-auto h-full">
        {/* Brand */}
        <Link to="/" className="font-display-lg text-title-sm font-bold text-primary tracking-tight">
          ShadowVale
        </Link>
        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 h-full pt-4">
          <Link to="/blogs" className="text-primary font-bold border-b-2 border-primary pb-4 h-full flex items-center hover:text-primary transition-colors duration-200">
            Content
          </Link>
          <Link to="/marketing/posts" className="text-on-surface-variant font-medium pb-4 h-full flex items-center hover:text-primary transition-colors duration-200">
            Balancing
          </Link>
          <Link to="/authorization" className="text-on-surface-variant font-medium pb-4 h-full flex items-center hover:text-primary transition-colors duration-200">
            Telemetry
          </Link>
          <Link to="/admin/users" className="text-on-surface-variant font-medium pb-4 h-full flex items-center hover:text-primary transition-colors duration-200">
            Logistics
          </Link>
        </div>
        {/* Trailing Actions */}
        <div className="flex items-center gap-4">
          <Link to="/login" className="font-data-mono text-label-caps text-on-surface-variant hover:text-primary transition-colors duration-200">
            System Status
          </Link>
          <Link to="/login" className="bg-primary text-on-primary font-data-mono text-label-caps px-4 py-2 rounded font-medium hover:bg-primary-fixed transition-colors duration-200 shadow-sm">
            Deploy Build
          </Link>
        </div>
      </div>
    </nav>
  );
};
