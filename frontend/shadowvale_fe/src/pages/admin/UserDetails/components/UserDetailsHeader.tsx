import React from 'react';
import { Link, useParams } from 'react-router-dom';

export const UserDetailsHeader: React.FC = () => {
  const { id } = useParams();
  return (
    <div>
      <div className="flex items-center gap-2 font-data-mono text-data-mono text-on-surface-variant mb-2">
        <span className="text-on-surface-variant">ENTITIES</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <Link to="/admin/users" className="hover:text-primary transition-colors">OPERATIVES</Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-on-surface uppercase">{id || 'OPR_7742'}</span>
      </div>
      <h1 className="font-display-lg text-display-lg text-on-surface">Operative Dossier</h1>
    </div>
  );
};
