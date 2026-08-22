import React from 'react';

export const UserAuditLog: React.FC = () => {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col flex-1">
      <div className="bg-surface-bright px-stack-md py-stack-sm border-b border-outline-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-sm">history</span>
        <h3 className="font-label-caps text-label-caps text-on-surface m-0">AUDIT_TRAIL</h3>
      </div>
      <div className="p-stack-md flex flex-col gap-4 relative">
        {/* Timeline vertical line */}
        <div className="absolute left-[1.6rem] top-stack-md bottom-stack-md w-px bg-outline-variant/50 pointer-events-none"></div>
        
        {/* Log Item 1 */}
        <div className="flex gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 ring-4 ring-surface"></div>
          <div className="flex-1">
            <div className="font-data-mono text-data-mono text-on-surface mb-0.5 flex justify-between">
              <span>AUTH_SUCCESS</span>
              <span className="text-on-surface-variant text-[11px]">2h ago</span>
            </div>
            <div className="font-body-md text-[12px] text-on-surface-variant leading-tight">IP: 192.168.0.45 via SECURE_GATEWAY_A</div>
          </div>
        </div>
        
        {/* Log Item 2 */}
        <div className="flex gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-outline-variant mt-1.5 ring-4 ring-surface"></div>
          <div className="flex-1">
            <div className="font-data-mono text-data-mono text-on-surface mb-0.5 flex justify-between">
              <span>ROLE_UPDATE</span>
              <span className="text-on-surface-variant text-[11px]">3d ago</span>
            </div>
            <div className="font-body-md text-[12px] text-on-surface-variant leading-tight">
              Analyst -&gt; Lead Interface Engineer <br/>
              <span className="text-on-surface-variant/50">Exec: SYS_ADMIN</span>
            </div>
          </div>
        </div>
        
        {/* Log Item 3 */}
        <div className="flex gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-outline-variant mt-1.5 ring-4 ring-surface"></div>
          <div className="flex-1">
            <div className="font-data-mono text-data-mono text-on-surface mb-0.5 flex justify-between">
              <span>ASSET_COMMIT</span>
              <span className="text-on-surface-variant text-[11px]">5d ago</span>
            </div>
            <div className="font-body-md text-[12px] text-on-surface-variant leading-tight">Updated UI_LIB_V4.2 (Hash: #8f92a1)</div>
          </div>
        </div>
        
        {/* Log Item 4 */}
        <div className="flex gap-3 relative z-10">
          <div className="w-2 h-2 rounded-full bg-outline-variant mt-1.5 ring-4 ring-surface"></div>
          <div className="flex-1">
            <div className="font-data-mono text-data-mono text-on-surface mb-0.5 flex justify-between">
              <span>PROFILE_SYNC</span>
              <span className="text-on-surface-variant text-[11px]">1w ago</span>
            </div>
            <div className="font-body-md text-[12px] text-on-surface-variant leading-tight">Metadata fields initialized.</div>
          </div>
        </div>
      </div>
      <div className="mt-auto border-t border-outline-variant p-2 text-center">
        <button className="font-data-mono text-data-mono text-primary hover:text-primary-fixed-dim transition-colors text-xs uppercase tracking-widest">
          LOAD_FULL_HISTORY
        </button>
      </div>
    </div>
  );
};
