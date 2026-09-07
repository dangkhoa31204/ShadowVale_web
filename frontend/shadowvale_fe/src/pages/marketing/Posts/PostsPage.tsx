import React, { useState } from 'react';
import { PostsHeader } from './components/PostsHeader';
import { PostsToolbar } from './components/PostsToolbar';
import { PostsTable } from './components/PostsTable';
import { PostCreateModal } from './components/PostCreateModal';

export const PostsPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="flex-1 w-full max-w-container-max mx-auto flex flex-col gap-stack-lg p-margin-page">
      <PostsHeader onCreateClick={() => setIsCreateModalOpen(true)} />
      <PostsToolbar />
      <PostsTable />

      <PostCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default PostsPage;
