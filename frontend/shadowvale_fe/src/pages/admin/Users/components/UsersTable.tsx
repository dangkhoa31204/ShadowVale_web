import React from 'react';
import { Link } from 'react-router-dom';


interface UsersTableProps {
  onDeleteClick: (user: any) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({ onDeleteClick }) => {
  return (
    <div className="bg-surface border border-border-subtle rounded overflow-hidden flex flex-col relative">
      {/* Table Header Bar */}
      <div className="bg-surface-bright border-b border-border-subtle px-4 py-2 flex items-center justify-between">
        <span className="font-label-caps text-label-caps text-on-surface-variant">Active Roster (1-50 of 1,248)</span>
        <div className="flex items-center gap-2">
          <button className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
          <span className="font-data-mono text-data-mono text-on-surface">Pg 1</span>
          <button className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
        </div>
      </div>
      
      {/* The Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse dense-table">
          <thead>
            <tr className="border-b border-border-subtle/50 text-on-surface-variant font-label-caps text-label-caps bg-surface-container-low/50">
              <th className="w-12 text-center pl-4 pr-2 py-2">#</th>
              <th className="font-medium py-2">Operative</th>
              <th className="font-medium py-2">Clearance</th>
              <th className="font-medium py-2">Status</th>
              <th className="font-medium py-2">Provisioned</th>
              <th className="font-medium py-2">Last Uplink</th>
              <th className="font-medium text-right pr-4 py-2">Directives</th>
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md text-on-surface divide-y divide-border-subtle/30 bg-surface-dim">
            {/* Row 1: Admin / Active */}
            <tr className="hover:bg-surface-container-low/50 transition-colors group">
              <td className="text-center text-on-surface-variant font-data-mono text-data-mono pl-4 pr-2 py-2">001</td>
              <td className="py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-warning/50 overflow-hidden bg-surface-container">
                    <img alt="Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOtvlYAEklrl88JVC-mrrfo2hc98qUDstrVr3gOX5OLsAXfqyKRIx_9Bw5BnQvZd3PhfGZaV9iRAzNg-MFKX-KpU3t09nl4BXqCEyrsKa1gZhSDuFFltYgjGuCWTRP9x0tJ7WPr7Ysr66HHWz9KT-13sYECuNlKrI9PqSoUN5v3nbKQB0xhhDxaIGie60JnV9ucQ4NSzywb2rWJ-vMHPEMfc7DdYKPtbOArG60WID2_UCLTITXSILKuw" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <Link to="/admin/users/usr_01" className="font-title-sm text-title-sm text-on-surface leading-tight group-hover:text-primary transition-colors">Vanguard_Prime</Link>
                    <span className="font-data-mono text-[11px] text-on-surface-variant">vanguard@ops.shadowvale.net</span>
                  </div>
                </div>
              </td>
              <td className="py-2">
                <span className="inline-flex items-center gap-1 font-data-mono text-data-mono text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20 shadow-[0_0_8px_rgba(250,204,21,0.2)]">
                  <span className="material-symbols-outlined text-[14px]">shield</span> Admin
                </span>
              </td>
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  <span className="font-label-caps text-[11px] text-success tracking-widest">ACTIVE</span>
                </div>
              </td>
              <td className="font-data-mono text-data-mono text-on-surface-variant py-2">2023.10.04</td>
              <td className="font-data-mono text-data-mono text-on-surface py-2">Now</td>
              <td className="text-right pr-4 py-2">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to="/admin/users/usr_01" className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="View Profile"><span className="material-symbols-outlined text-[16px]">visibility</span></Link>
                  <Link to="/admin/users/usr_01" className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Modify"><span className="material-symbols-outlined text-[16px]">edit</span></Link>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-warning hover:bg-surface-container transition-colors" title="Reset Encryption"><span className="material-symbols-outlined text-[16px]">lock_reset</span></button>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors" title="Revoke Access"><span className="material-symbols-outlined text-[16px]">power_settings_new</span></button>
                </div>
              </td>
            </tr>
            
            {/* Row 2: Analyst / Inactive */}
            <tr className="hover:bg-surface-container-low/50 transition-colors group bg-surface/50">
              <td className="text-center text-on-surface-variant font-data-mono text-data-mono pl-4 pr-2 py-2">042</td>
              <td className="py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-border-subtle overflow-hidden bg-surface-container grayscale opacity-70">
                    <img alt="Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyEdviYUKroPXWG7LoZFFBYd0CAcn7jh8RHVKTb6HaWXNlx6HPMjKWd8sGhV7ytG14ObzD-As1QlX2yapTgXNwmU3mb0rdfP1q1Kyif712qBXcgW6YbArhfuWbM85CmA8AYEEFCsmqOKR-ViWgYnN8u4oeMgg-YsYyt36ubl6dNttzvVKxJrTlj_E8PUlpkOvne7xiLEa6mtq0TVAcXACHC8NCfzcToT_7r2wUGXBmmSca8xusBzJzdg" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <Link to="/admin/users/usr_02" className="font-title-sm text-title-sm text-on-surface/80 leading-tight group-hover:text-primary transition-colors">Echo_Sierra</Link>
                    <span className="font-data-mono text-[11px] text-on-surface-variant/70">esierra@ops.shadowvale.net</span>
                  </div>
                </div>
              </td>
              <td className="py-2">
                <span className="inline-flex items-center gap-1 font-data-mono text-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  L3 Analyst
                </span>
              </td>
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
                  <span className="font-label-caps text-[11px] text-on-surface-variant tracking-widest">INACTIVE</span>
                </div>
              </td>
              <td className="font-data-mono text-data-mono text-on-surface-variant py-2">2024.01.12</td>
              <td className="font-data-mono text-data-mono text-on-surface-variant py-2">42 hrs ago</td>
              <td className="text-right pr-4 py-2">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to="/admin/users/usr_02" className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="View Profile"><span className="material-symbols-outlined text-[16px]">visibility</span></Link>
                  <Link to="/admin/users/usr_02" className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Modify"><span className="material-symbols-outlined text-[16px]">edit</span></Link>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-success hover:bg-surface-container transition-colors" title="Restore Access"><span className="material-symbols-outlined text-[16px]">power_settings_new</span></button>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors" onClick={() => onDeleteClick({name: 'Echo_Sierra'})} title="Purge Record"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              </td>
            </tr>
            
            {/* Row 3: Designer / Active */}
            <tr className="hover:bg-surface-container-low/50 transition-colors group">
              <td className="text-center text-on-surface-variant font-data-mono text-data-mono pl-4 pr-2 py-2">117</td>
              <td className="py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-border-subtle overflow-hidden bg-surface-container">
                    <img alt="Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcIVufeGDk3IOKwAdNwzONiU2HZ3AD0xN9xd7zBEy3cng65IKQneFSSUm44iu6bsASKEEN6RA7Vv6-E5ojUzzxDq209RLSTtMhw0cpmx4yVZDMbNeBzI7Oc7kcePU-TkfDYqFTMgn0KV4JYN_ceHI6pjs2HFM7kEN1eemWJYMHN2VNDZORL3509kH5YeW1kzWp67IA3k24pJATqpEkC9e8NLjWZ7YuiSh7lLqxW7FL2-kutjmq34qVaQ" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <Link to="/admin/users/usr_03" className="font-title-sm text-title-sm text-on-surface leading-tight group-hover:text-primary transition-colors">Ghost_Protocol</Link>
                    <span className="font-data-mono text-[11px] text-on-surface-variant">ghost@dev.shadowvale.net</span>
                  </div>
                </div>
              </td>
              <td className="py-2">
                <span className="inline-flex items-center gap-1 font-data-mono text-data-mono text-on-surface bg-surface-container-high px-2 py-0.5 rounded border border-border-subtle">
                  L2 Designer
                </span>
              </td>
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  <span className="font-label-caps text-[11px] text-success tracking-widest">ACTIVE</span>
                </div>
              </td>
              <td className="font-data-mono text-data-mono text-on-surface-variant py-2">2024.03.22</td>
              <td className="font-data-mono text-data-mono text-on-surface py-2">2 mins ago</td>
              <td className="text-right pr-4 py-2">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to="/admin/users/usr_03" className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="View Profile"><span className="material-symbols-outlined text-[16px]">visibility</span></Link>
                  <Link to="/admin/users/usr_03" className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="Modify"><span className="material-symbols-outlined text-[16px]">edit</span></Link>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-warning hover:bg-surface-container transition-colors" title="Reset Encryption"><span className="material-symbols-outlined text-[16px]">lock_reset</span></button>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors" title="Revoke Access"><span className="material-symbols-outlined text-[16px]">power_settings_new</span></button>
                </div>
              </td>
            </tr>
            
            {/* Row 4: Suspended / Pending */}
            <tr className="hover:bg-surface-container-low/50 transition-colors group bg-error/5 relative overflow-hidden">
              <td className="absolute left-0 top-0 bottom-0 w-1 bg-error"></td>
              <td className="text-center text-on-surface-variant font-data-mono text-data-mono pl-4 pr-2 py-2">204</td>
              <td className="py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-error/50 overflow-hidden bg-surface-container grayscale">
                    <span className="material-symbols-outlined text-error opacity-50 w-full h-full flex items-center justify-center text-[20px]">person_off</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-sm text-title-sm text-error leading-tight group-hover:text-error-container transition-colors line-through decoration-error/50">Rogue_Element</span>
                    <span className="font-data-mono text-[11px] text-on-surface-variant/70">unknown@external.net</span>
                  </div>
                </div>
              </td>
              <td className="py-2">
                <span className="inline-flex items-center gap-1 font-data-mono text-data-mono text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded border border-border-subtle opacity-50">
                  L1 Support
                </span>
              </td>
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-error"></span>
                  <span className="font-label-caps text-[11px] text-error tracking-widest">SUSPENDED</span>
                </div>
              </td>
              <td className="font-data-mono text-data-mono text-on-surface-variant py-2">2024.04.01</td>
              <td className="font-data-mono text-data-mono text-error font-bold py-2">LOCKOUT</td>
              <td className="text-right pr-4 py-2">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to="/admin/users/usr_04" className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" title="View Logs"><span className="material-symbols-outlined text-[16px]">visibility</span></Link>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors" onClick={() => onDeleteClick({name: 'Rogue_Element'})} title="Purge Record"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Lower decorative border */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
    </div>
  );
};
