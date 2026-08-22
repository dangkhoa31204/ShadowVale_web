import React from 'react';
import { Link } from 'react-router-dom';

export const PostHeader: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 mb-8">
      <div className="flex items-center gap-2 font-data-mono text-data-mono text-on-surface-variant">
        <span className="text-on-surface-variant">Content</span>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link to="/marketing/posts" className="hover:text-primary transition-colors">Posts</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-on-surface">Edit Briefing</span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-on-surface flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]">edit_document</span>
          Edit Intelligence Briefing
        </h1>
        <div className="flex items-center gap-2">
          <span className="font-data-mono text-data-mono text-success flex items-center gap-1 bg-surface border border-border-subtle px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            Draft auto-saved at 14:32:10
          </span>
        </div>
      </div>
    </div>
  );
};
