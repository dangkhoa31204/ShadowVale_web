import React, { useState } from 'react';
import { RolesGrid } from './components/RolesGrid';
import { PermissionMatrix } from './components/PermissionMatrix';
import { ConfirmModal } from './components/ConfirmModal';

export const RoleManagementPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getRoleId = (role: string) => {
    switch(role) {
      case 'admin': return 'ROL-992A';
      case 'designer': return 'ROL-441B';
      case 'analyst': return 'ROL-773C';
      default: return 'ROL-000X';
    }
  };

  const handleCommit = () => {
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    setIsModalOpen(false);
    // Add real API call here later
    console.log(`Changes saved for ${selectedRole}`);
  };

  return (
    <div className="max-w-container-max mx-auto">
      {/* Page Header */}
      <div className="mb-stack-lg flex items-end justify-between border-b border-border-subtle pb-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">ROLE MANAGEMENT</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Configure global access tiers and systemic permissions.</p>
        </div>
        <button className="font-label-caps text-label-caps text-primary border border-primary px-3 py-1 hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">add_moderator</span>
          Create Custom Role
        </button>
      </div>
      
      <RolesGrid selectedRole={selectedRole} onSelectRole={setSelectedRole} />
      
      <PermissionMatrix 
        roleName={selectedRole} 
        roleId={getRoleId(selectedRole)} 
        onCommitChanges={handleCommit} 
      />
      
      <ConfirmModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={handleConfirm}
        roleName={selectedRole}
        roleId={getRoleId(selectedRole)}
      />
    </div>
  );
};

export default RoleManagementPage;
