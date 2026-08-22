import React from 'react';

export const UsersMetrics: React.FC = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-stack-lg">
      {/* Card 1: Total */}
      <div className="border border-border-subtle flex flex-col p-4 relative overflow-hidden group bg-surface-container rounded-sm">
        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
        <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">Total Operatives</div>
        <div className="font-display-lg text-[28px] font-bold text-on-surface mt-auto">1,248</div>
        <div className="font-data-mono text-data-mono text-success flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-[14px]">trending_up</span> +12 this cycle
        </div>
      </div>
      
      {/* Card 2: Active */}
      <div className="border border-border-subtle flex flex-col p-4 relative overflow-hidden bg-surface-container rounded-sm">
        <div className="absolute inset-0 bg-success/5 pointer-events-none"></div>
        <div className="font-label-caps text-label-caps text-on-surface-variant mb-2 flex justify-between items-start">
          Active Now
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
        </div>
        <div className="font-display-lg text-[28px] font-bold text-success mt-auto">84</div>
        <div className="w-full h-1 bg-surface-container-high mt-2 rounded overflow-hidden">
          <div className="h-full bg-success w-[15%]"></div>
        </div>
      </div>
      
      {/* Card 3: Designers */}
      <div className="border border-border-subtle flex flex-col p-4 bg-surface-container rounded-sm">
        <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">Designers</div>
        <div className="font-display-lg text-[28px] font-bold text-on-surface mt-auto">12</div>
        <div className="font-data-mono text-data-mono text-on-surface-variant flex items-center gap-1 mt-1">
          Clearance L2
        </div>
      </div>
      
      {/* Card 4: Analysts */}
      <div className="border border-border-subtle flex flex-col p-4 bg-surface-container rounded-sm">
        <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">Analysts</div>
        <div className="font-display-lg text-[28px] font-bold text-on-surface mt-auto">8</div>
        <div className="font-data-mono text-data-mono text-on-surface-variant flex items-center gap-1 mt-1">
          Clearance L3
        </div>
      </div>
      
      {/* Card 5: Admins */}
      <div className="border border-border-subtle flex flex-col p-4 relative overflow-hidden bg-surface-container rounded-sm">
        <div className="absolute left-0 top-0 h-full w-1 bg-warning"></div>
        <div className="font-label-caps text-label-caps text-on-surface-variant mb-2 pl-2">Admins</div>
        <div className="font-display-lg text-[28px] font-bold text-warning mt-auto pl-2">4</div>
        <div className="font-data-mono text-data-mono text-warning/70 flex items-center gap-1 mt-1 pl-2">
          <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span> Max Clearance
        </div>
      </div>
    </div>
  );
};
