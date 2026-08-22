import React from 'react';
import { useAuth } from '../../../../hooks/useAuth';

export const ProfileInfo: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden flex flex-col sm:flex-row bg-surface-container-low">
      {/* Avatar Section */}
      <div className="p-stack-lg flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-border-subtle w-full sm:w-1/3 min-w-[200px] bg-surface-container-high">
        <div className="w-32 h-32 rounded-full border-2 border-primary-container p-1 mb-4 relative">
          <img 
            className="w-full h-full rounded-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500" 
            alt="Tactical Operative Portrait" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqmZfEvdwgSdZWawzWum3iy18KNpW0EPpN0_5lGzO6pkVi5_uJtjNiTygerUuGJMjubDIjDDI4hJW1g8R2JTOtugpQlwAL0OGhfD1AnK79J4HyvRlvkbOUHFzB7D_6QzGYX-8iFYRoyIHnk6JeM6VRssV_CVbEBRRpcyX6m_Proxr19ZSE_9ynZxn3Vh7HbNptSWUyhZQNO4kLK6RQf35mJc3TZMrCpOf8Xw3xhXtGDp6s09ViIs6FvA" 
          />
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-success rounded-full border-2 border-surface"></div>
        </div>
        <h3 className="font-title-sm text-title-sm text-on-surface text-center uppercase tracking-wider mb-1">
          {user?.callsign || 'GHOST_LEAD'}
        </h3>
        <p className="font-label-caps text-label-caps text-primary">{user?.role || 'System Administrator'}</p>
      </div>
      
      {/* Details Section */}
      <div className="p-stack-lg flex-1">
        <div className="space-y-6">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-widest opacity-70">Callsign (Username)</label>
            <div className="font-data-mono text-data-mono text-on-surface bg-surface-container-high py-2 px-3 rounded-DEFAULT border border-border-subtle">
              {user?.callsign || 'GHOST_LEAD'}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-widest opacity-70">Full Name</label>
              <div className="font-body-md text-body-md text-on-surface border-b border-border-subtle pb-1">Classified - Redacted</div>
            </div>
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-widest opacity-70">Access Tier</label>
              <div className="font-body-md text-body-md text-on-surface border-b border-border-subtle pb-1">Omega Level {user?.clearanceLevel?.replace('CL-', '') || '5'}</div>
            </div>
          </div>
          
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-widest opacity-70">Comms Uplink (Email)</label>
            <div className="font-data-mono text-data-mono text-on-surface bg-surface-container-high py-2 px-3 rounded-DEFAULT border border-border-subtle">
              {user?.email || 'ghost.lead@shadowvale.sys'}
            </div>
          </div>
          
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-widest opacity-70">Commission Date</label>
            <div className="font-data-mono text-data-mono text-on-surface border-b border-border-subtle pb-1">2042-11-04T08:00:00Z</div>
          </div>
        </div>
        
        <div className="mt-8 flex gap-4 pt-4 border-t border-border-subtle">
          <button className="bg-primary text-on-primary font-label-caps text-label-caps px-6 py-2 rounded-DEFAULT font-bold transition-colors flex items-center gap-2 hover:opacity-90">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
            Edit Profile
          </button>
          <button className="border border-outline-variant text-on-surface font-label-caps text-label-caps px-6 py-2 rounded-DEFAULT transition-colors hover:bg-surface-container-highest">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
};
