import React from 'react';
import { ProfileInfo } from './components/ProfileInfo';
import { SystemStatus } from './components/SystemStatus';

export const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-stack-lg border-b border-border-subtle pb-4">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-2 tracking-tight uppercase">Operative Profile</h1>
        <p className="text-on-surface-variant font-body-md text-body-md">Manage your system credentials and account status.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        {/* Left Column: Profile Info */}
        <div className="lg:col-span-2 space-y-gutter">
          <ProfileInfo />
        </div>
        
        {/* Right Column: Status */}
        <div className="lg:col-span-1 space-y-gutter">
          <SystemStatus />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
