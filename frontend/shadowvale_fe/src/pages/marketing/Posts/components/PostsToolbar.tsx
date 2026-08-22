import React from 'react';

export const PostsToolbar: React.FC = () => {
  return (
    <div className="bg-surface border border-border-subtle rounded-DEFAULT p-3 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="relative w-full md:w-96">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">search</span>
        <input 
          type="text" 
          placeholder="Query post titles, authors, or IDs..." 
          className="w-full bg-surface-container-low border border-border-subtle rounded-DEFAULT text-on-surface pl-9 pr-3 py-2 font-data-mono text-data-mono focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
        <div className="flex items-center bg-surface-container-low border border-border-subtle rounded-DEFAULT p-1 whitespace-nowrap">
          <span className="font-label-caps text-label-caps text-on-surface-variant px-2 uppercase">Status:</span>
          <select className="bg-transparent border-none text-on-surface py-1 pl-2 pr-8 font-data-mono text-data-mono focus:ring-0 cursor-pointer">
            <option value="all">All States</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex items-center bg-surface-container-low border border-border-subtle rounded-DEFAULT p-1 whitespace-nowrap">
          <span className="font-label-caps text-label-caps text-on-surface-variant px-2 uppercase">Sort:</span>
          <select className="bg-transparent border-none text-on-surface py-1 pl-2 pr-8 font-data-mono text-data-mono focus:ring-0 cursor-pointer">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="updated">Recently Updated</option>
          </select>
        </div>
        <button 
          title="Advanced Filters"
          className="bg-surface-container-low border border-border-subtle hover:bg-surface-variant text-on-surface w-9 h-9 flex items-center justify-center rounded-DEFAULT transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-sm">tune</span>
        </button>
      </div>
    </div>
  );
};
