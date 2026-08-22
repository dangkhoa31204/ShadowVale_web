import React from 'react';
import { Link } from 'react-router-dom';

interface BlogCardProps {
  id: string;
  tag: string;
  logId: string;
  date: string;
  title: string;
  description: string;
  operator: string;
  imageSrc: string;
}

export const BlogCard: React.FC<BlogCardProps> = ({ id, tag, logId, date, title, description, operator, imageSrc }) => {
  return (
    <div className="rounded border border-outline-variant bg-surface flex flex-col group hover:border-primary/50 transition-colors duration-300">
      <div className="h-48 relative overflow-hidden border-b border-outline-variant">
        <img 
          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
          alt={title} 
          src={imageSrc}
        />
        <div className="absolute top-3 left-3 bg-surface/80 backdrop-blur border border-outline-variant px-2 py-0.5 rounded font-data-mono text-[10px] text-on-surface uppercase">
          {tag}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="font-data-mono text-[10px] text-on-surface-variant mb-2">LOG: {logId} | {date}</div>
        <h4 className="font-title-sm text-title-sm text-on-surface mb-2 group-hover:text-primary transition-colors">{title}</h4>
        <p className="font-body-md text-sm text-on-surface-variant mb-4 line-clamp-2">{description}</p>
        
        <div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center justify-between">
          <span className="font-label-caps text-[10px] text-on-surface-variant">OPERATOR: {operator}</span>
          <Link 
            to={`/blogs/${id}`} 
            className="text-primary font-data-mono text-xs hover:underline decoration-primary/50 underline-offset-4 flex items-center gap-1"
          >
            READ <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
