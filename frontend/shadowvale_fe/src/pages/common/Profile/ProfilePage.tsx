import React from 'react';
import { useAuth } from '../../../hooks/useAuth';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="bg-surface border border-border-subtle p-8 rounded shadow-2xl max-w-[500px] w-full">
      <h2 className="font-display-lg text-2xl text-primary font-bold mb-4">Operative Profile</h2>
      <div className="space-y-2 font-data-mono text-xs text-on-surface-variant">
        <p><span className="text-on-surface font-bold">Callsign:</span> {user?.callsign}</p>
        <p><span className="text-on-surface font-bold">Email:</span> {user?.email}</p>
        <p><span className="text-on-surface font-bold">Role:</span> {user?.role}</p>
        <p><span className="text-on-surface font-bold">Clearance:</span> {user?.clearanceLevel}</p>
      </div>
    </div>
  );
};

export default ProfilePage;
