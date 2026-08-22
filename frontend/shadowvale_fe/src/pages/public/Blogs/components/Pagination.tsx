import React from 'react';

export const Pagination: React.FC = () => {
  return (
    <div className="flex items-center justify-center pt-8 border-t border-outline-variant/50">
      <nav className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-data-mono text-xs font-semibold">
          1
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded border border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-data-mono text-xs">
          2
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded border border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-data-mono text-xs">
          3
        </button>
        <span className="text-on-surface-variant px-1 font-data-mono">...</span>
        <button className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </nav>
    </div>
  );
};
