import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const mockData = [
  {
    id: 'DOC-992A',
    title: 'Q3 Lore Expansion Brief',
    status: 'published',
    author: 'A. Vance',
    category: 'Worldbuilding',
    updated: '2h ago',
    archived: false
  },
  {
    id: 'DOC-993B',
    title: 'Weapon Rebalance Specs V2',
    status: 'draft',
    author: 'S. Reynolds',
    category: 'Mechanics',
    updated: '5h ago',
    archived: false
  },
  {
    id: 'DOC-850C',
    title: 'Holiday Event 2023 Assets',
    status: 'archived',
    author: 'System',
    category: 'Events',
    updated: '14d ago',
    archived: true
  },
  {
    id: 'DOC-991D',
    title: 'Patch Notes v1.2.4',
    status: 'published',
    author: 'K. Chen',
    category: 'Release Notes',
    updated: '1d ago',
    archived: false
  }
];

const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'published':
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-success/10 border border-success/20">
          <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
          <span className="text-success text-[11px] uppercase tracking-wider font-label-caps">Published</span>
        </div>
      );
    case 'draft':
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-warning/10 border border-warning/20">
          <div className="w-1.5 h-1.5 rounded-full bg-warning"></div>
          <span className="text-warning text-[11px] uppercase tracking-wider font-label-caps">Draft</span>
        </div>
      );
    case 'archived':
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-secondary-container/30 border border-secondary/20">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
          <span className="text-secondary text-[11px] uppercase tracking-wider font-label-caps">Archived</span>
        </div>
      );
    default:
      return null;
  }
};

const renderActions = (status: string, id: string) => {
  return (
    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {status === 'archived' ? (
        <>
          <button className="text-on-surface-variant hover:text-on-surface transition-colors" title="Restore">
            <span className="material-symbols-outlined text-[18px]">unarchive</span>
          </button>
          <button className="text-on-surface-variant hover:text-error transition-colors" title="Delete">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </>
      ) : (
        <>
          <Link to={`/marketing/posts/${id}`} className="text-on-surface-variant hover:text-primary transition-colors" title="Edit">
            <span className="material-symbols-outlined text-[18px]">edit_square</span>
          </Link>
          {status === 'draft' ? (
            <button className="text-on-surface-variant hover:text-success transition-colors" title="Publish">
              <span className="material-symbols-outlined text-[18px]">publish</span>
            </button>
          ) : (
            <button className="text-on-surface-variant hover:text-on-surface transition-colors" title="View">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          )}
          <button className="text-on-surface-variant hover:text-error transition-colors" title="Archive">
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          </button>
          <div className="relative ml-1 border-l border-border-subtle pl-2">
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const PostsTable: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(mockData.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const hasSelection = selectedIds.size > 0;
  const isAllSelected = selectedIds.size === mockData.length;

  return (
    <div className="bg-surface border border-border-subtle rounded-DEFAULT flex flex-col overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-bright">
              <th className="p-3 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded border-outline-variant bg-surface-container-highest text-primary focus:ring-primary focus:ring-offset-surface cursor-pointer tactical-checkbox" 
                />
              </th>
              <th className="p-3 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Title / ID</th>
              <th className="p-3 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Status</th>
              <th className="p-3 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Author</th>
              <th className="p-3 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">Category</th>
              <th className="p-3 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider hidden xl:table-cell">Updated</th>
              <th className="p-3 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="font-data-mono text-data-mono divide-y divide-border-subtle/50">
            {mockData.map((item) => (
              <tr key={item.id} className={`hover:bg-surface-container-low transition-colors group ${item.archived ? 'opacity-75' : ''} ${selectedIds.has(item.id) ? 'bg-surface-container-low' : ''}`}>
                <td className="p-3 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(item.id)}
                    onChange={() => handleSelectOne(item.id)}
                    className="rounded border-outline-variant bg-surface-container-highest text-primary focus:ring-primary focus:ring-offset-surface cursor-pointer tactical-checkbox" 
                  />
                </td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <Link
                      to={`/marketing/posts/${item.id}`}
                      className={`text-on-surface font-medium truncate max-w-[200px] sm:max-w-[300px] hover:text-primary transition-colors ${item.archived ? 'line-through' : ''}`}
                    >
                      {item.title}
                    </Link>
                    <span className="text-on-surface-variant text-[11px]">ID: {item.id}</span>
                  </div>
                </td>
                <td className="p-3">
                  {renderStatusBadge(item.status)}
                </td>
                <td className="p-3 text-on-surface-variant hidden md:table-cell">{item.author}</td>
                <td className="p-3 text-on-surface-variant hidden lg:table-cell">{item.category}</td>
                <td className="p-3 text-on-surface-variant hidden xl:table-cell">{item.updated}</td>
                <td className="p-3 text-right">
                  {renderActions(item.status, item.id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer / Bulk Actions & Pagination */}
      <div className="border-t border-border-subtle bg-surface-container-lowest p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-on-surface-variant font-data-mono text-data-mono text-[11px]">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border-subtle"></div>
          <select 
            className={`bg-surface-container border border-border-subtle py-1 px-2 rounded-sm font-data-mono text-[11px] ${hasSelection ? 'text-on-surface cursor-pointer' : 'text-on-surface-variant opacity-50 cursor-not-allowed'}`}
            disabled={!hasSelection}
          >
            <option>Bulk Actions</option>
            <option>Publish Selected</option>
            <option>Archive Selected</option>
            <option>Delete Selected</option>
          </select>
          <button 
            className={`px-3 py-1 rounded-sm font-data-mono text-[11px] border ${hasSelection ? 'bg-primary text-on-primary border-primary hover:opacity-90 cursor-pointer' : 'bg-surface-variant text-on-surface-variant border-border-subtle opacity-50 cursor-not-allowed'}`}
            disabled={!hasSelection}
          >
            Apply
          </button>
        </div>
        
        <div className="flex items-center gap-4 font-data-mono text-data-mono text-[11px]">
          <span className="text-on-surface-variant">Showing 1-4 of 128</span>
          <div className="flex items-center gap-1">
            <button 
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface-container border border-border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-variant disabled:opacity-50" 
              disabled
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-sm bg-primary text-on-primary font-bold">
              1
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface-container border border-border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-variant">
              2
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface-container border border-border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-variant">
              3
            </button>
            <span className="px-1 text-on-surface-variant">...</span>
            <button className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface-container border border-border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-variant">
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
