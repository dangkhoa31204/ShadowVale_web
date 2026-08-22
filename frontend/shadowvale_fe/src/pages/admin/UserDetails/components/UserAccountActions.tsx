import React from 'react';

export const UserAccountActions: React.FC = () => {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
      <div className="bg-surface-bright px-stack-md py-stack-sm border-b border-outline-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-sm">terminal</span>
        <h3 className="font-label-caps text-label-caps text-on-surface m-0">DIRECT_COMMANDS</h3>
      </div>
      <div className="p-stack-md flex flex-col gap-stack-sm">
        <button className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-bright transition-colors rounded px-4 py-2 font-data-mono text-data-mono flex items-center justify-between group">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-sm">lock_reset</span>
            RESET_CREDENTIALS
          </div>
          <span className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">SENDS_LINK</span>
        </button>
        <button className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-bright transition-colors rounded px-4 py-2 font-data-mono text-data-mono flex items-center justify-between group">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-warning transition-colors text-sm">block</span>
            SUSPEND_OPERATIVE
          </div>
          <span className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">REVOKES_ACCESS</span>
        </button>
        <div className="w-full h-px bg-outline-variant/30 my-2"></div>
        <button className="w-full bg-error/10 border border-error/50 text-error hover:bg-error/20 transition-colors rounded px-4 py-2 font-data-mono text-data-mono flex items-center justify-between group relative overflow-hidden">
          {/* subtle hazard stripes for dangerous action */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #F87171 10px, #F87171 20px)' }}></div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-sm">delete_forever</span>
            PURGE_ENTITY
          </div>
          <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity relative z-10 font-bold">IRREVERSIBLE</span>
        </button>
      </div>
    </div>
  );
};
