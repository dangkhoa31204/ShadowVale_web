import React from 'react';
import { Link } from 'react-router-dom';

export const PostsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="font-display-lg text-2xl text-primary font-bold">Marketing Posts List</h1>
      <div className="bg-surface border border-border-subtle p-4 rounded">
        <Link to="/marketing/posts/1" className="font-data-mono text-sm text-on-surface hover:text-primary">
          Marketing Campaign Post #1
        </Link>
      </div>
    </div>
  );
};

export default PostsPage;
