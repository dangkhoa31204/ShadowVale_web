import React from 'react';
import { Link } from 'react-router-dom';

export const UsersPage: React.FC = () => {
  const users = [
    { id: 'usr_01', callsign: 'OPERATIVE-SPECTRE', email: 'spectre@shadowvale.io', role: 'operative', clearance: 'CL-2' },
    { id: 'usr_02', callsign: 'COMMANDER-VALKYRIE', email: 'valkyrie@shadowvale.io', role: 'admin', clearance: 'CL-1 ADMIN' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-border-subtle">
        <h1 className="font-display-lg text-2xl text-tertiary font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">group</span>
          Users List Management
        </h1>
        <span className="font-data-mono text-xs text-on-surface-variant">TOTAL OPERATIVES: {users.length}</span>
      </div>

      <div className="bg-surface border border-border-subtle rounded overflow-hidden">
        <table className="w-full text-left font-data-mono text-xs">
          <thead className="bg-surface-container text-on-surface-variant uppercase text-[10px] border-b border-border-subtle">
            <tr>
              <th className="p-3">Callsign</th>
              <th className="p-3">Comms Uplink</th>
              <th className="p-3">Role</th>
              <th className="p-3">Clearance</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface-bright/50">
                <td className="p-3 font-bold text-on-surface">{u.callsign}</td>
                <td className="p-3 text-on-surface-variant">{u.email}</td>
                <td className="p-3 uppercase text-primary">{u.role}</td>
                <td className="p-3 text-tertiary">{u.clearance}</td>
                <td className="p-3 text-right">
                  <Link to={`/admin/users/${u.id}`} className="text-primary hover:underline">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;
