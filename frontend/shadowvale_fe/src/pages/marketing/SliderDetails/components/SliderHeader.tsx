import React from 'react';
import { Link } from 'react-router-dom';

export const SliderHeader: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-stack-lg">
      <div>
        <nav className="flex items-center gap-2 text-on-surface-variant font-label-caps text-[11px] uppercase tracking-wider mb-2">
          <span className="text-on-surface-variant">Content</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link to="/marketing/sliders" className="hover:text-primary transition-colors">Sliders</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">Edit Slider</span>
        </nav>
        <h2 className="font-headline-md text-headline-md text-on-surface">Operation Override Protocol</h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 border border-outline-variant text-on-surface font-label-caps text-label-caps rounded hover:bg-surface-container-high transition-colors flex items-center gap-2">
          Cancel
        </button>
        <button className="px-4 py-2 bg-surface-container text-primary border border-primary/30 font-label-caps text-label-caps rounded hover:bg-primary/10 transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          Preview
        </button>
        <button className="px-4 py-2 bg-primary text-on-primary font-label-caps text-label-caps rounded hover:bg-primary-fixed transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">save</span>
          Save
        </button>
        <button className="px-4 py-2 bg-success text-on-primary font-label-caps text-label-caps rounded hover:bg-success/90 transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">publish</span>
          Publish
        </button>
      </div>
    </div>
  );
};
