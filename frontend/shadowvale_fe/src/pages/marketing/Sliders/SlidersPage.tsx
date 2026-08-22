import React from 'react';
import { SlidersHeader } from './components/SlidersHeader';
import { SlidersToolbar } from './components/SlidersToolbar';
import { SlidersGrid } from './components/SlidersGrid';

export const SlidersPage: React.FC = () => {
  return (
    <div className="flex-1 w-full max-w-container-max mx-auto p-margin-page flex flex-col gap-stack-lg">
      <SlidersHeader />
      <SlidersToolbar />
      <SlidersGrid />
    </div>
  );
};

export default SlidersPage;
