import React from 'react';

interface SlidersHeaderProps {
  onCreateClick?: () => void;
}

export const SlidersHeader: React.FC<SlidersHeaderProps> = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-subtle pb-6">
      <div>
        <h2 className="font-display-lg text-display-lg text-on-surface mb-2">Banner & Slider Management</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">Control hero carousels and tactical broadcast banners across the operative network.</p>
      </div>
      <button 
        onClick={onCreateClick}
        className="shrink-0 bg-primary hover:bg-primary-fixed text-on-primary font-data-mono text-data-mono px-4 py-2.5 rounded flex items-center gap-2 transition-colors border border-transparent shadow-[0_0_15px_rgba(171,202,232,0.15)] cursor-pointer font-bold"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        CREATE NEW SLIDER
      </button>
    </div>
  );
};
