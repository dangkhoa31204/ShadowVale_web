import React from 'react';
import { Link } from 'react-router-dom';

export const SlidersPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="font-display-lg text-2xl text-primary font-bold">Marketing Sliders List</h1>
      <div className="bg-surface border border-border-subtle p-4 rounded">
        <Link to="/marketing/sliders/1" className="font-data-mono text-sm text-on-surface hover:text-primary">
          Homepage Main Hero Banner Slider #1
        </Link>
      </div>
    </div>
  );
};

export default SlidersPage;
