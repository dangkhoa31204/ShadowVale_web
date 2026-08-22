import React from 'react';
import { PostsHeader } from './components/PostsHeader';
import { PostsToolbar } from './components/PostsToolbar';
import { PostsTable } from './components/PostsTable';

export const PostsPage: React.FC = () => {
  return (
    <div className="flex-1 w-full max-w-container-max mx-auto flex flex-col gap-stack-lg p-margin-page">
      <PostsHeader />
      <PostsToolbar />
      <PostsTable />
    </div>
  );
};

export default PostsPage;
