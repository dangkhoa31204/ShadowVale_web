import React, { useEffect, useState } from 'react';

interface UserDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export const UserDeleteModal: React.FC<UserDeleteModalProps> = ({ isOpen, onClose, user }) => {
  const [confirmText, setConfirmText] = useState('');
  
  // Reset input when modal opens/closes
  useEffect(() => {
    if (!isOpen) setConfirmText('');
  }, [isOpen]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Content */}
      <div className="bg-surface-container-low border border-error/30 rounded w-full max-w-md shadow-2xl overflow-hidden animate-[modalEnter_0.2s_ease-out_forwards] relative">
        {/* Warning Header Strip */}
        <div className="bg-error-container text-on-error-container px-4 py-2 flex items-center gap-2 relative z-10">
          <span className="material-symbols-outlined text-[20px]">warning</span>
          <span className="font-label-caps text-label-caps tracking-widest font-bold">CRITICAL DIRECTIVE</span>
        </div>
        
        <div className="p-6 relative z-10">
          <h3 className="font-display-lg text-[24px] text-on-surface mb-2">Purge Operative Record</h3>
          <p className="font-body-md text-on-surface-variant mb-6">
            You are about to permanently delete the profile for <strong className="text-on-surface">{user.name}</strong>. This action will scrub all associated telemetry, local access keys, and historical commit logs.
            <br/><br/>
            <span className="text-error/80 text-[13px] font-data-mono">WARN: This action is irreversible across the ShadowVale network.</span>
          </p>
          
          {/* Tactical Input Confirmation */}
          <div className="mb-6">
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">AUTHORIZATION REQUIRED</label>
            <input 
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-surface-dim border border-error/50 text-error font-data-mono text-data-mono rounded px-3 py-2 focus:border-error focus:ring-1 focus:ring-error placeholder-error/30 transition-colors uppercase outline-none" 
              placeholder="Type 'PURGE' to confirm" 
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded border border-outline-variant text-on-surface font-label-caps text-label-caps hover:bg-surface-container transition-colors"
            >
              ABORT
            </button>
            <button 
              onClick={onClose}
              disabled={confirmText.toUpperCase() !== 'PURGE'}
              className="px-4 py-2 rounded bg-error text-on-error font-label-caps text-label-caps hover:bg-error-container hover:text-on-error-container transition-colors flex items-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              EXECUTE PURGE
            </button>
          </div>
        </div>
        
        {/* Decorative scanline over modal */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] opacity-50 mix-blend-overlay z-0"></div>
      </div>
    </div>
  );
};
