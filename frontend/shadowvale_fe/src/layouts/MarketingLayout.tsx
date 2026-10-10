import { useTranslation } from '../features/preferences/preferencesContext';
import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const MarketingLayout: React.FC = () => {
  const t = useTranslation();
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md bg-tactical-grid flex flex-col">
      <header className="border-b border-border-subtle bg-surface-container/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display-lg text-xl text-primary brand-glow flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-2xl">campaign</span>
              {t("ShadowVale Marketing")}</Link>
            <nav className="flex items-center gap-4 font-data-mono text-xs text-on-surface-variant">
              <Link to="/marketing/posts" className="hover:text-primary transition-colors">{t("POSTS")}</Link>
              <Link to="/marketing/sliders" className="hover:text-primary transition-colors">{t("SLIDERS")}</Link>
            </nav>
          </div>
          <Link to="/login" className="font-data-mono text-xs text-on-surface-variant hover:text-primary">{t("EXIT")}</Link>
        </div>
      </header>
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};
