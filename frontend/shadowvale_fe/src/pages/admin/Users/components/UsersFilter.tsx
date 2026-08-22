import React from 'react';

export const UsersFilter: React.FC = () => {
  return (
    <div className="bg-surface border border-border-subtle rounded p-2 mb-4 flex flex-col lg:flex-row gap-3 items-center">
      {/* Search Input */}
      <div className="relative w-full lg:w-96 flex-shrink-0">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">search</span>
        <input 
          type="text"
          className="w-full border text-on-surface font-data-mono text-data-mono pl-9 pr-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary placeholder-on-surface-variant/50 transition-colors bg-surface-dim border-outline-variant rounded-sm outline-none" 
          placeholder="Search by Designation or Comm-Link..." 
        />
      </div>
      
      <div className="w-px h-6 bg-border-subtle hidden lg:block mx-1"></div>
      
      {/* Filters */}
      <div className="flex-1 flex flex-wrap gap-2 w-full">
        {/* Clearance Filter */}
        <div className="relative min-w-[140px]">
          <select className="w-full appearance-none border text-on-surface font-label-caps text-label-caps pl-3 pr-8 py-2 focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer bg-surface-dim border-outline-variant rounded-sm outline-none" defaultValue="">
            <option disabled value="">Clearance (Role)</option>
            <option value="all">All Levels</option>
            <option value="l1">L1 - Support</option>
            <option value="l2">L2 - Designer</option>
            <option value="l3">L3 - Analyst</option>
            <option value="max">Max - Admin</option>
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">arrow_drop_down</span>
        </div>
        
        {/* Status Filter */}
        <div className="relative min-w-[140px]">
          <select className="w-full appearance-none border text-on-surface font-label-caps text-label-caps pl-3 pr-8 py-2 focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer bg-surface-dim border-outline-variant rounded-sm outline-none" defaultValue="">
            <option disabled value="">Status</option>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">arrow_drop_down</span>
        </div>
        
        {/* Join Date Filter */}
        <div className="relative min-w-[160px]">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">calendar_today</span>
          <select className="w-full appearance-none border text-on-surface font-label-caps text-label-caps pl-8 pr-8 py-2 focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer bg-surface-dim border-outline-variant rounded-sm outline-none" defaultValue="all">
            <option value="30">Last 30 Cycles</option>
            <option value="90">Last 90 Cycles</option>
            <option value="365">Last Solar Year</option>
            <option value="all">All Time</option>
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">arrow_drop_down</span>
        </div>
      </div>
      
      <button className="h-9 px-3 flex items-center justify-center rounded border border-outline-variant bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0" title="Reset Filters">
        <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
      </button>
    </div>
  );
};
