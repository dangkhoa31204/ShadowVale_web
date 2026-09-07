import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-[650px] relative z-10 p-6 text-center">
      <div className="bg-surface border border-border-subtle rounded-lg shadow-2xl p-8 relative overflow-hidden">
        {/* Top Warning Strip */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-error via-warning to-error opacity-80" />

        <div className="w-20 h-20 mx-auto mb-6 rounded border border-error/40 bg-error/10 flex items-center justify-center text-error relative">
          <span className="material-symbols-outlined text-4xl animate-pulse">radar</span>
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-error rounded-full" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-error/10 border border-error/30 text-error font-data-mono text-xs font-bold uppercase mb-4">
          <span className="w-2 h-2 rounded-full bg-error animate-ping" />
          ERROR CODE: 0x404 // SECTOR_UNREACHABLE
        </div>

        <h1 className="font-display-lg text-3xl sm:text-4xl text-on-surface font-bold tracking-tight mb-3">
          TACTICAL SIGNAL LOST
        </h1>

        <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto mb-8 leading-relaxed">
          The requested coordinate sector does not exist or your clearance beacon cannot establish telemetry with this node.
        </p>

        {/* Diagnostic data block */}
        <div className="bg-surface-dim border border-border-subtle rounded p-3 mb-8 text-left font-data-mono text-[11px] text-on-surface-variant space-y-1">
          <div className="flex justify-between">
            <span className="text-primary">[RADAR] SCAN TARGET:</span>
            <span className="text-error">UNRESOLVED GRID</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary">[UPLINK] LATENCY:</span>
            <span>TIMEOUT (&gt;5000ms)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary">[STATUS] ACTION REQUIRED:</span>
            <span className="text-warning">FALLBACK TO SAFE HUB</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            PREVIOUS SECTOR
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-base">home</span>
            RETURN TO BASE
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
