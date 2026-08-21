import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md bg-tactical-grid flex flex-col">
      <header className="border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display-lg text-xl text-primary brand-glow flex items-center gap-2 font-bold">
            <span className="material-symbols-outlined text-2xl">terminal</span>
            ShadowVale
          </Link>

          <nav className="flex items-center gap-6 font-data-mono text-xs text-on-surface-variant">
            <Link to="/" className="hover:text-primary transition-colors">HOME</Link>
            <Link to="/blogs" className="hover:text-primary transition-colors">BLOGS</Link>
            <Link to="/marketing/posts" className="hover:text-primary transition-colors">MARKETING</Link>
            <Link to="/login" className="bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 rounded hover:bg-primary hover:text-on-primary transition-all">AUTHENTICATE</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-6">
        <Outlet />
      </main>

      <footer className="border-t border-border-subtle bg-surface/40 py-6 text-center font-data-mono text-xs text-on-surface-variant/60">
        SHADOWVALE NETWORK // SEC-LEVEL 2 OPERATIVE CLEARANCE
      </footer>
    </div>
  );
};
