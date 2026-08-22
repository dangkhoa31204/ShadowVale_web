import React from 'react';
import { useAuth } from '../../../../hooks/useAuth';

export const SystemStatus: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-gutter">
      {/* Active Status Card */}
      <div className="border border-border-subtle rounded-lg p-stack-lg relative overflow-hidden bg-surface-container-low">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>shield</span>
        </div>
        
        <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 uppercase tracking-widest">Network Status</h3>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-success"></span>
          </div>
          <span className="font-headline-md text-headline-md text-success tracking-widest uppercase">Active</span>
        </div>
        
        <div className="space-y-4 font-data-mono text-data-mono text-sm">
          <div className="flex justify-between border-b border-border-subtle pb-2">
            <span className="text-on-surface-variant">Clearance:</span>
            <span className="text-warning">LEVEL {user?.clearanceLevel?.replace('CL-', '') || '5'} (OMEGA)</span>
          </div>
          <div className="flex justify-between border-b border-border-subtle pb-2">
            <span className="text-on-surface-variant">Last Node:</span>
            <span className="text-on-surface">SV-NA-EAST-01</span>
          </div>
          <div className="flex justify-between border-b border-border-subtle pb-2">
            <span className="text-on-surface-variant">Session IP:</span>
            <span className="text-on-surface opacity-50">192.168.***.***</span>
          </div>
          <div className="pt-2">
            <span className="text-on-surface-variant block mb-1">Last Login:</span>
            <span className="text-on-surface">2024-05-20 14:32:11 UTC</span>
          </div>
        </div>
      </div>
      
      {/* System Alerts */}
      <div className="border border-outline-variant rounded-lg p-4 bg-surface-container">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-3 uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-warning" style={{ fontSize: '16px' }}>warning</span>
          Security Advisories
        </h3>
        <p className="font-body-md text-body-md text-on-surface mb-2 opacity-80">Mandatory bi-weekly password rotation due in 4 days.</p>
        <a className="font-label-caps text-label-caps text-primary hover:underline flex items-center gap-1" href="#">
          Review Security Policy <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
        </a>
      </div>
    </div>
  );
};
