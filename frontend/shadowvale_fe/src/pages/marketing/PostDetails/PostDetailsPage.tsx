import React from 'react';
import { useParams } from 'react-router-dom';

export const PostDetailsPage: React.FC = () => {
  const { id } = useParams();
  return (
    <div className="bg-surface border border-border-subtle p-6 rounded">
      <h1 className="font-display-lg text-xl text-primary font-bold">Marketing Post Details #{id}</h1>
    </div>
  );
};

export default PostDetailsPage;
