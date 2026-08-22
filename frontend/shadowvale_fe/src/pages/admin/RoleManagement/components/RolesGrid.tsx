import React from 'react';

interface RolesGridProps {
  onSelectRole: (role: string) => void;
  selectedRole: string;
}

export const RolesGrid: React.FC<RolesGridProps> = ({ onSelectRole, selectedRole }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-stack-lg">
      {/* Admin Card */}
      <div 
        className={`${selectedRole === 'admin' ? 'bg-surface-variant border-primary' : 'bg-surface border-outline-variant hover:border-primary/50'} border p-stack-md relative group cursor-pointer transition-colors`} 
        onClick={() => onSelectRole('admin')}
      >
        {selectedRole === 'admin' && <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>}
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-label-caps text-label-caps tracking-widest ${selectedRole === 'admin' ? 'text-primary' : 'text-on-surface'}`}>ADMIN</h3>
          <span className="font-data-mono text-data-mono text-on-surface bg-surface-container px-2 py-0.5 border border-border-subtle">4 Users</span>
        </div>
        <p className="text-body-md text-on-surface-variant min-h-[40px] mb-4">Full system access and operative management. Bypasses all restrictions.</p>
        <div className="border-t border-border-subtle pt-3">
          <p className="font-label-caps text-[10px] text-outline-variant mb-2">KEY INHERITANCE</p>
          <ul className="font-data-mono text-data-mono text-on-surface-variant space-y-1">
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-success rounded-full"></span> All System Config</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-success rounded-full"></span> User Management</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-success rounded-full"></span> Destructive Actions</li>
          </ul>
        </div>
      </div>

      {/* Designer Card */}
      <div 
        className={`${selectedRole === 'designer' ? 'bg-surface-variant border-primary' : 'bg-surface border-outline-variant hover:border-primary/50'} border p-stack-md relative group cursor-pointer transition-colors`} 
        onClick={() => onSelectRole('designer')}
      >
        {selectedRole === 'designer' && <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>}
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-label-caps text-label-caps tracking-widest ${selectedRole === 'designer' ? 'text-primary' : 'text-on-surface'}`}>DESIGNER</h3>
          <span className="font-data-mono text-data-mono text-on-surface bg-surface-container px-2 py-0.5 border border-border-subtle">12 Users</span>
        </div>
        <p className="text-body-md text-on-surface-variant min-h-[40px] mb-4">Game content creation, entity modification, and balancing tools access.</p>
        <div className="border-t border-border-subtle pt-3">
          <p className="font-label-caps text-[10px] text-outline-variant mb-2">KEY INHERITANCE</p>
          <ul className="font-data-mono text-data-mono text-on-surface-variant space-y-1">
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary rounded-full"></span> Entity Editor</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary rounded-full"></span> Version Publishing</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-outline-variant rounded-full"></span> Read-Only Telemetry</li>
          </ul>
        </div>
      </div>

      {/* Analyst Card */}
      <div 
        className={`${selectedRole === 'analyst' ? 'bg-surface-variant border-primary' : 'bg-surface border-outline-variant hover:border-primary/50'} border p-stack-md relative group cursor-pointer transition-colors`} 
        onClick={() => onSelectRole('analyst')}
      >
        {selectedRole === 'analyst' && <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>}
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-label-caps text-label-caps tracking-widest ${selectedRole === 'analyst' ? 'text-primary' : 'text-on-surface'}`}>ANALYST</h3>
          <span className="font-data-mono text-data-mono text-on-surface bg-surface-container px-2 py-0.5 border border-border-subtle">8 Users</span>
        </div>
        <p className="text-body-md text-on-surface-variant min-h-[40px] mb-4">Data analysis, telemetry reporting, and player metrics visualization.</p>
        <div className="border-t border-border-subtle pt-3">
          <p className="font-label-caps text-[10px] text-outline-variant mb-2">KEY INHERITANCE</p>
          <ul className="font-data-mono text-data-mono text-on-surface-variant space-y-1">
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-info rounded-full"></span> Advanced Analytics</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-info rounded-full"></span> Data Export</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 bg-error rounded-full"></span> No Write Access</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
