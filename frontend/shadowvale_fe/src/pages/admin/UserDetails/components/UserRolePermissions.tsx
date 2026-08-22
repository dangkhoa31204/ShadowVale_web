import React from 'react';

export const UserRolePermissions: React.FC = () => {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col flex-1">
      <div className="bg-surface-bright px-stack-md py-stack-sm border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">vpn_key</span>
          <h3 className="font-label-caps text-label-caps text-on-surface m-0">ACCESS_PROTOCOLS</h3>
        </div>
        <button className="font-data-mono text-data-mono text-primary hover:text-primary-fixed-dim transition-colors flex items-center gap-1 border border-primary/30 px-2 py-0.5 rounded bg-primary/5 hover:bg-primary/10">
          <span className="material-symbols-outlined text-[14px]">edit</span>
          EDIT
        </button>
      </div>
      <div className="p-stack-md flex flex-col gap-stack-sm">
        <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
          <span className="font-body-md text-body-md text-on-surface">View Telemetry</span>
          <span className="material-symbols-outlined text-success">check_circle</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
          <span className="font-body-md text-body-md text-on-surface">Edit Interface Assets</span>
          <span className="material-symbols-outlined text-success">check_circle</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
          <span className="font-body-md text-body-md text-on-surface">Deploy to Staging</span>
          <span className="material-symbols-outlined text-success">check_circle</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-outline-variant/20 opacity-50">
          <span className="font-body-md text-body-md text-on-surface">Deploy to Production</span>
          <span className="material-symbols-outlined text-on-surface-variant">cancel</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-outline-variant/20 opacity-50">
          <span className="font-body-md text-body-md text-on-surface">Manage Operatives</span>
          <span className="material-symbols-outlined text-on-surface-variant">cancel</span>
        </div>
      </div>
    </div>
  );
};
