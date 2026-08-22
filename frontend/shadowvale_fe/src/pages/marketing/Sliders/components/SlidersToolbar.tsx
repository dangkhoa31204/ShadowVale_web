import React from 'react';

export const SlidersToolbar: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 bg-surface-container p-4 rounded border border-border-subtle items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">search</span>
            <input 
              className="bg-surface border border-border-subtle rounded font-body-md text-body-md pl-9 pr-3 py-2 w-full focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface transition-all placeholder:text-on-surface-variant" 
              placeholder="Search banners by title or ID..." 
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <span className="font-label-caps text-label-caps text-on-surface-variant shrink-0">FILTER BY:</span>
          <button className="bg-surface-variant text-on-surface border border-outline-variant px-3 py-1 rounded font-label-caps text-label-caps hover:bg-surface-container-highest transition-colors whitespace-nowrap">STATUS: ALL</button>
          <button className="bg-surface text-on-surface-variant border border-border-subtle px-3 py-1 rounded font-label-caps text-label-caps hover:text-on-surface transition-colors whitespace-nowrap">PLATFORM: PC</button>
          <button className="bg-surface text-on-surface-variant border border-border-subtle px-3 py-1 rounded font-label-caps text-label-caps hover:text-on-surface transition-colors whitespace-nowrap">TYPE: HERO</button>
        </div>
      </div>
      
      {/* Hint */}
      <div className="flex items-center gap-2 text-on-surface-variant font-data-mono text-data-mono bg-surface/50 border border-border-subtle px-4 py-2 rounded-lg w-fit">
        <span className="material-symbols-outlined text-[16px] text-primary">drag_indicator</span>
        Drag cards to reorder deployment priority.
      </div>
    </div>
  );
};
