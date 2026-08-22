import React from 'react';
import { UserDetailsHeader } from './components/UserDetailsHeader';
import { UserProfileHeader } from './components/UserProfileHeader';
import { UserAccountInfo } from './components/UserAccountInfo';
import { UserRolePermissions } from './components/UserRolePermissions';
import { UserAccountActions } from './components/UserAccountActions';
import { UserAuditLog } from './components/UserAuditLog';

export const UserDetailsPage: React.FC = () => {
  return (
    <div className="flex-1 w-full max-w-container-max mx-auto p-gutter space-y-stack-lg">
      <UserDetailsHeader />
      <UserProfileHeader />
      
      {/* Grid Layout for Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-gutter">
          <UserAccountInfo />
          <UserRolePermissions />
        </div>
        
        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-gutter">
          <UserAccountActions />
          <UserAuditLog />
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage;
