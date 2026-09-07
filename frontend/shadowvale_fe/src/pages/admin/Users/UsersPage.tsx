import React, { useState } from 'react';
import { UsersHeader } from './components/UsersHeader';
import { UsersMetrics } from './components/UsersMetrics';
import { UsersFilter } from './components/UsersFilter';
import { UsersTable } from './components/UsersTable';
import { UserDeleteModal } from './components/UserDeleteModal';
import { UserCreateModal } from './components/UserCreateModal';

export const UsersPage: React.FC = () => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  return (
    <div className="w-full flex-1">
      <UsersHeader onProvisionClick={() => setCreateModalOpen(true)} />
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

      <UserCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
};

export default UsersPage;
