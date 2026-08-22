import React from 'react';

export const PageHeader: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-6">
      <div>
        <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight uppercase">Intelligence Briefings</h1>
        <p className="font-data-mono text-on-surface-variant mt-2 text-sm uppercase opacity-70">Global Dev Operations Network</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-surface border border-outline-variant rounded px-3 py-2">
          <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">sort</span>
          <select className="bg-transparent border-none text-on-surface font-label-caps text-label-caps focus:ring-0 py-0 pl-0 pr-6">
            <option>Latest Transmissions</option>
            <option>Top Priority</option>
            <option>Archived</option>
          </select>
        </div>
      </div>
    </div>
  );
};
