import React from 'react';

export const PostsHeader: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md text-on-surface">Posts</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Manage content nodes and distribution states.</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="bg-surface-container border border-border-subtle hover:border-outline-variant text-on-surface px-3 py-2 rounded-DEFAULT font-data-mono text-data-mono flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-sm">download</span>
          Export
        </button>
        <button className="bg-primary text-on-primary hover:bg-primary-fixed-dim px-4 py-2 rounded-DEFAULT font-data-mono text-data-mono flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-sm">add</span>
          Create Post
        </button>
      </div>
    </div>
  );
};
