import React from 'react';

export const UsersHeader: React.FC = () => {
  return (
    <div className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="font-display-lg text-display-lg text-on-surface mb-1 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[32px]">shield_person</span>
          Operative Directory
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Manage system access and clearance levels.</p>
      </div>
      <div className="flex gap-3">
        <button className="h-9 px-4 flex items-center gap-2 rounded border border-outline-variant bg-transparent text-on-surface font-label-caps text-label-caps hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-[16px]">download</span>
          EXPORT ROSTER
        </button>
        <button className="h-9 px-4 flex items-center gap-2 rounded bg-primary text-on-primary font-label-caps text-label-caps hover:bg-primary-container hover:text-on-primary-container transition-colors font-bold">
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          PROVISION NEW
        </button>
      </div>
    </div>
  );
};
