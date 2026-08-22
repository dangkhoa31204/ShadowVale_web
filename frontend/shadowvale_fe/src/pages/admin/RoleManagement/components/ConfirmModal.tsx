import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roleName: string;
  roleId: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, roleName, roleId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface border border-warning p-stack-lg w-full max-w-md shadow-2xl relative">
        {/* Glitch decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-warning/50"></div>
        
        <div className="flex items-start gap-4 mb-6">
          <span className="material-symbols-outlined text-warning text-[32px] mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <div>
            <h3 className="font-headline-md text-title-sm text-on-surface mb-2 uppercase tracking-wide">Confirm Security Modification</h3>
            <p className="text-body-md text-on-surface-variant">You are about to alter core system access privileges for the <strong className="text-on-surface">{roleName.toUpperCase()}</strong> role. This action is logged and may affect active sessions.</p>
          </div>
        </div>
        
        <div className="bg-surface-container border border-border-subtle p-3 mb-6 font-data-mono text-[12px] text-outline-variant">
          <div className="flex justify-between border-b border-border-subtle pb-1 mb-1">
            <span>Target Role:</span><span className="text-primary">{roleName.toUpperCase()} ({roleId})</span>
          </div>
          <div className="flex justify-between border-b border-border-subtle pb-1 mb-1">
            <span>Modified Nodes:</span><span className="text-on-surface">0</span>
          </div>
          <div className="flex justify-between">
            <span>Auth Level Req:</span><span className="text-error">Lvl 4 (SysAdmin)</span>
          </div>
        </div>
        
        <div className="flex justify-end gap-4">
          <button 
            className="font-label-caps text-label-caps text-on-surface border border-outline-variant px-4 py-2 hover:bg-surface-variant transition-colors" 
            onClick={onClose}
          >
            Abort
          </button>
          <button 
            className="font-label-caps text-label-caps bg-warning text-surface px-6 py-2 hover:bg-tertiary transition-colors font-bold" 
            onClick={onConfirm}
          >
            Acknowledge &amp; Save
          </button>
        </div>
      </div>
    </div>
  );
};
