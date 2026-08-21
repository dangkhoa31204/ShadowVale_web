import React from 'react';

interface CommandCenterProps {
  callsign: string;
  onLogout: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ callsign, onLogout }) => {
  return (
    <div className="w-full max-w-[800px] relative z-10 p-4">
      {/* Top Header Card */}
      <div className="bg-surface border border-border-subtle rounded-lg shadow-2xl overflow-hidden mb-6 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-success"></div>
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded border border-success/40 bg-success/10 flex items-center justify-center text-success relative">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-success rounded-full border-2 border-surface"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-data-mono text-[11px] px-2 py-0.5 rounded bg-success/20 text-success border border-success/30 font-bold uppercase">
                  ACCESS GRANTED
                </span>
                <span className="font-data-mono text-[11px] text-on-surface-variant">CL-2 OPERATIVE</span>
              </div>
              <h2 className="font-display-lg text-2xl text-on-surface font-bold mt-1 tracking-tight">
                WELCOME, <span className="text-primary">{callsign.toUpperCase()}</span>
              </h2>
              <p className="font-label-caps text-xs text-on-surface-variant">
                OPERATIVE TERMINAL ID: SV-TRM-{Math.floor(1000 + Math.random() * 9000)}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="bg-error-container/30 hover:bg-error-container text-error border border-error/40 font-data-mono text-xs font-bold px-4 py-2 rounded uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">power_settings_new</span>
            TERMINATE SESSION
          </button>
        </div>
      </div>

      {/* Grid of Tactical Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border-subtle rounded p-4 flex items-center justify-between">
          <div>
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">Uplink Status</p>
            <p className="font-data-mono text-sm text-success font-bold mt-0.5">ENCRYPTED (AES-256)</p>
          </div>
          <span className="material-symbols-outlined text-success text-2xl">wifi_tethering</span>
        </div>

        <div className="bg-surface border border-border-subtle rounded p-4 flex items-center justify-between">
          <div>
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">Active Sector</p>
            <p className="font-data-mono text-sm text-primary font-bold mt-0.5">SECTOR-09 OVERWATCH</p>
          </div>
          <span className="material-symbols-outlined text-primary text-2xl">radar</span>
        </div>

        <div className="bg-surface border border-border-subtle rounded p-4 flex items-center justify-between">
          <div>
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">Security Rating</p>
            <p className="font-data-mono text-sm text-tertiary font-bold mt-0.5">CLASS A CLEARANCE</p>
          </div>
          <span className="material-symbols-outlined text-tertiary text-2xl">shield</span>
        </div>
      </div>

      {/* Live System Log Output */}
      <div className="bg-surface-dim border border-border-subtle rounded-lg p-4 font-data-mono text-xs text-on-surface-variant">
        <div className="flex justify-between items-center pb-2 border-b border-border-subtle mb-3">
          <span className="text-primary font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">terminal</span>
            OPERATIVE LOG FEED
          </span>
          <span className="text-[10px] text-success animate-pulse">LIVE TELEMETRY</span>
        </div>
        <div className="space-y-1.5 opacity-90 text-[11px]">
          <p><span className="text-primary">[SYS.INIT]</span> Tactical session initialized for callsign: {callsign}</p>
          <p><span className="text-success">[AUTH.OK]</span> Two-factor handshake completed successfully.</p>
          <p><span className="text-info">[NET.LINK]</span> Routing packets through node shadowvale.internal:8443</p>
          <p><span className="text-warning">[SEC.AUDIT]</span> Zero anomalies detected. System status optimal.</p>
        </div>
      </div>
    </div>
  );
};
