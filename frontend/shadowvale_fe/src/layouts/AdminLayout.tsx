import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';

export const AdminLayout: React.FC = () => {
  return (
    <div className="bg-background text-on-surface font-body-md antialiased overflow-hidden flex h-screen">
      <AdminSidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-w-0 bg-background">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-margin-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
