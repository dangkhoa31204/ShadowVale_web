import React from 'react';
import { SliderHeader } from './components/SliderHeader';
import { SliderForm } from './components/SliderForm';
import { SliderPreview } from './components/SliderPreview';

export const SliderDetailsPage: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-gutter bg-background relative z-0">
      <SliderHeader />
      
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        <SliderForm />
        <SliderPreview />
      </div>
    </div>
  );
};

export default SliderDetailsPage;
