import React, { useState } from 'react';
import { UsersHeader } from './components/UsersHeader';
import { UsersMetrics } from './components/UsersMetrics';
import { UsersFilter } from './components/UsersFilter';
import { UsersTable } from './components/UsersTable';
import { UserDeleteModal } from './components/UserDeleteModal';

export const UsersPage: React.FC = () => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  return (
    <div className="w-full flex-1">
      <UsersHeader />
      <UsersMetrics />
      <UsersFilter />
      <UsersTable onDeleteClick={handleDeleteClick} />
      
      <UserDeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }} 
        user={userToDelete} 
      />
    </div>
  );
};

export default UsersPage;
