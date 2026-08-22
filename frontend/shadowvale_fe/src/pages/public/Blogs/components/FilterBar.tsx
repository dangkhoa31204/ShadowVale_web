import React from 'react';

export const FilterBar: React.FC = () => {
  const filters = ['All', 'Stealth Systems', 'AI Development', 'Game Design', 'Balancing'];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter, index) => (
        <button 
          key={filter}
          className={`px-4 py-1.5 rounded-full border font-label-caps text-label-caps transition-colors ${
            index === 0 
              ? 'border-primary bg-primary-container text-on-primary-container' 
              : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary bg-surface'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};
