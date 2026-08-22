import React from 'react';
import { PostHeader } from './components/PostHeader';
import { PostEditor } from './components/PostEditor';

export const PostDetailsPage: React.FC = () => {
  return (
    <div className="flex-1 w-full max-w-container-max mx-auto p-margin-page flex flex-col relative">
      <PostHeader />
      
      {/* Two Column Layout (HTML only provided left column, so we use max-w to constrain it) */}
      <div className="flex flex-col xl:flex-row gap-gutter flex-1 items-start">
        <PostEditor />
      </div>
    </div>
  );
};

export default PostDetailsPage;
