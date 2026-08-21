import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const BlogDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="bg-surface border border-border-subtle p-8 rounded shadow-2xl space-y-4">
      <Link to="/blogs" className="font-data-mono text-xs text-primary flex items-center gap-1 hover:underline">
        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Blogs
      </Link>
      <h1 className="font-display-lg text-2xl text-on-surface font-bold">Blog Article Details #{id}</h1>
      <p className="font-data-mono text-xs text-on-surface-variant leading-relaxed">
        Detailed intelligence dispatch content for article reference {id}. All communication channels verified encrypted.
      </p>
    </div>
  );
};

export default BlogDetailsPage;
