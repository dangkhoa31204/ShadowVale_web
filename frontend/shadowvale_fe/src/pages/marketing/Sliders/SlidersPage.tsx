import React, { useState } from 'react';
import { SlidersHeader } from './components/SlidersHeader';
import { SlidersToolbar } from './components/SlidersToolbar';
import { SlidersGrid } from './components/SlidersGrid';
import { SliderCreateModal } from './components/SliderCreateModal';

export const SlidersPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="flex-1 w-full max-w-container-max mx-auto p-margin-page flex flex-col gap-stack-lg">
      <SlidersHeader onCreateClick={() => setIsCreateModalOpen(true)} />
      <SlidersToolbar />
      <SlidersGrid />

      <SliderCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default SlidersPage;
