import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export const CommonLayout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (isHomePage) {
    return (
      <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md relative overflow-x-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md flex items-center justify-center p-4 sm:p-gutter bg-tactical-grid relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary rounded-full blur-[150px] opacity-5 pointer-events-none"></div>

      <main className="w-full flex justify-center items-center relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

