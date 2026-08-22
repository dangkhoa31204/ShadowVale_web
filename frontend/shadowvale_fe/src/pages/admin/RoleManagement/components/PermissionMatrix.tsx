import React from 'react';

interface PermissionMatrixProps {
  roleName: string;
  roleId: string;
  onCommitChanges: () => void;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ roleName, roleId, onCommitChanges }) => {
  return (
    <div className="bg-surface border border-outline-variant relative">
      {/* Title Bar */}
      <div className="bg-surface-bright px-stack-md py-3 border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[20px]">rule</span>
          <h4 className="font-label-caps text-label-caps text-on-surface">PERMISSION MATRIX: <span className="text-primary ml-1">{roleName.toUpperCase()}</span></h4>
        </div>
        <span className="font-data-mono text-data-mono text-on-surface-variant bg-surface-container px-2 py-1 text-[11px] border border-border-subtle">ID: {roleId}</span>
      </div>
      
      {/* Matrix Content */}
      <div className="p-stack-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Category: System Access */}
          <div>
            <h5 className="font-label-caps text-label-caps text-on-surface-variant border-b border-border-subtle pb-2 mb-4 tracking-wider">SYSTEM ACCESS</h5>
            <div className="space-y-3">
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">User Management</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">Create, edit, suspend users</span>
                </div>
              </label>
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">Role Management</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">Modify permission matrices</span>
                </div>
              </label>
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">System Configuration</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">Global environment variables</span>
                </div>
              </label>
            </div>
          </div>
          
          {/* Category: Content Operations */}
          <div>
            <h5 className="font-label-caps text-label-caps text-on-surface-variant border-b border-border-subtle pb-2 mb-4 tracking-wider">CONTENT OPERATIONS</h5>
            <div className="space-y-3">
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">Content Management</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">Edit entities and assets</span>
                </div>
              </label>
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">Content Validation</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">Approve pending changes</span>
                </div>
              </label>
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">Version Management</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">Create branches and tags</span>
                </div>
              </label>
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-error group-hover:text-error-container transition-colors">Publishing (Live Ops)</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">Deploy to production servers</span>
                </div>
              </label>
            </div>
          </div>
          
          {/* Category: Data & Analysis */}
          <div>
            <h5 className="font-label-caps text-label-caps text-on-surface-variant border-b border-border-subtle pb-2 mb-4 tracking-wider">DATA &amp; ANALYSIS</h5>
            <div className="space-y-3">
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">Telemetry Access</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">View live server events</span>
                </div>
              </label>
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">Analytics Queries</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">Run historical data queries</span>
                </div>
              </label>
              <label className="flex items-start cursor-pointer group">
                <input defaultChecked className="tactical-checkbox mt-0.5 w-4 h-4 bg-surface-container border-outline-variant rounded-sm text-primary focus:ring-primary focus:ring-offset-surface" type="checkbox"/>
                <div className="ml-3">
                  <span className="block text-body-md text-on-surface group-hover:text-primary transition-colors">Content-Version Comparison</span>
                  <span className="block font-data-mono text-[11px] text-outline-variant mt-0.5">A/B test analysis tools</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Footer */}
      <div className="bg-surface-container-lowest px-stack-md py-4 border-t border-border-subtle flex justify-end gap-4">
        <button className="font-label-caps text-label-caps text-on-surface border border-outline-variant px-6 py-2 hover:bg-surface-variant transition-colors">
          Discard
        </button>
        <button 
          className="font-label-caps text-label-caps bg-primary text-on-primary px-6 py-2 hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-[0_0_15px_rgba(171,202,232,0.1)]" 
          onClick={onCommitChanges}
        >
          Commit Changes
        </button>
      </div>
    </div>
  );
};
