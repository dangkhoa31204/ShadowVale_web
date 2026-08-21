import React from 'react';
import { Link } from 'react-router-dom';

export const BlogsPage: React.FC = () => {
  const blogs = [
    { id: '1', title: 'Protocol SV-99: Quantum Encryption Shift', date: '2026-08-20', author: 'Spectre-01' },
    { id: '2', title: 'Tactical Reconnaissance in Cyberpunk Systems', date: '2026-08-18', author: 'Valkyrie' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h1 className="font-display-lg text-3xl text-primary font-bold">Public Intelligence Blogs</h1>
        <p className="font-data-mono text-xs text-on-surface-variant mt-1">Dispatches and technical analysis from ShadowVale command.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {blogs.map((b) => (
          <Link key={b.id} to={`/blogs/${b.id}`} className="bg-surface border border-border-subtle hover:border-primary p-5 rounded transition-all block">
            <h3 className="font-display-lg text-lg text-on-surface font-bold">{b.title}</h3>
            <div className="flex justify-between items-center font-data-mono text-xs text-on-surface-variant mt-3">
              <span>By {b.author}</span>
              <span>{b.date}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BlogsPage;
