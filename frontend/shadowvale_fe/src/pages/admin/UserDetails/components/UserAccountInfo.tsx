import React from 'react';

export const UserAccountInfo: React.FC = () => {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col h-full">
      <div className="bg-surface-bright px-stack-md py-stack-sm border-b border-outline-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-sm">badge</span>
        <h3 className="font-label-caps text-label-caps text-on-surface m-0">IDENTITY_METADATA</h3>
      </div>
      <div className="p-stack-md grid grid-cols-1 sm:grid-cols-2 gap-y-stack-md gap-x-gutter">
        <div>
          <label className="font-data-mono text-data-mono text-on-surface-variant block mb-1">Username</label>
          <div className="font-body-md text-body-md text-on-surface border-b border-outline-variant/30 pb-1">k.vance_77</div>
        </div>
        <div>
          <label className="font-data-mono text-data-mono text-on-surface-variant block mb-1">Clearance Level</label>
          <div className="font-body-md text-body-md text-on-surface border-b border-outline-variant/30 pb-1 flex items-center gap-2">
            <span className="text-warning">LEVEL_4 (OMEGA)</span>
          </div>
        </div>
        <div>
          <label className="font-data-mono text-data-mono text-on-surface-variant block mb-1">Created Date</label>
          <div className="font-body-md text-body-md text-on-surface border-b border-outline-variant/30 pb-1 font-data-mono">2023-11-04 08:22:15 UTC</div>
        </div>
        <div>
          <label className="font-data-mono text-data-mono text-on-surface-variant block mb-1">Last Login</label>
          <div className="font-body-md text-body-md text-on-surface border-b border-outline-variant/30 pb-1 font-data-mono">2024-05-12 14:03:59 UTC</div>
        </div>
        <div className="sm:col-span-2">
          <label className="font-data-mono text-data-mono text-on-surface-variant block mb-1">Origin Node</label>
          <div className="font-body-md text-body-md text-on-surface border-b border-outline-variant/30 pb-1 font-data-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">lan</span>
            192.168.0.45 [SECTOR_7]
          </div>
        </div>
      </div>
    </div>
  );
};
