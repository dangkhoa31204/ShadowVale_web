import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const UserDetailsPage: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="bg-surface border border-border-subtle p-6 rounded space-y-4">
      <Link to="/admin/users" className="font-data-mono text-xs text-primary flex items-center gap-1 hover:underline">
        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Users List
      </Link>
      <h1 className="font-display-lg text-2xl text-tertiary font-bold">User Details ID: {id}</h1>
      <p className="font-data-mono text-xs text-on-surface-variant">Administrative audit record and clearance controls for user {id}.</p>
    </div>
  );
};

export default UserDetailsPage;
