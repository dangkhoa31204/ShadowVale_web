import React, { useState } from 'react';
import { useToast } from '../../../components/ui/Toast';

interface StatMetric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
  indicatorColor: string;
}

const METRICS: StatMetric[] = [
  {
    title: 'ACTIVE OPERATIVES',
    value: '42,891',
    change: '+12.4% vs last cycle',
    isPositive: true,
    icon: 'groups',
    indicatorColor: 'text-primary',
  },
  {
    title: 'PEAK CONCURRENT (CCU)',
    value: '18,405',
    change: '+5.8% peak load',
    isPositive: true,
    icon: 'network_check',
    indicatorColor: 'text-success',
  },
  {
    title: 'CORE TELEMETRY PING',
    value: '14.2 ms',
    change: '-2.1 ms latency',
    isPositive: true,
    icon: 'speed',
    indicatorColor: 'text-info',
  },
  {
    title: 'CRITICAL ANOMALIES',
    value: '0',
    change: 'Zero breach detected',
    isPositive: true,
    icon: 'shield',
    indicatorColor: 'text-success',
  },
];

interface ClusterNode {
  name: string;
  region: string;
  load: number;
  status: 'OPTIMAL' | 'DEGRADED' | 'MAINTENANCE';
  ccu: number;
}

const CLUSTERS: ClusterNode[] = [
  { name: 'VALE-SHARD-ALPHA', region: 'US-EAST (N. VIRGINIA)', load: 68, status: 'OPTIMAL', ccu: 6240 },
  { name: 'VALE-SHARD-BRAVO', region: 'EU-CENTRAL (FRANKFURT)', load: 84, status: 'OPTIMAL', ccu: 7810 },
  { name: 'VALE-SHARD-CHARLIE', region: 'AP-EAST (TOKYO)', load: 45, status: 'OPTIMAL', ccu: 3120 },
  { name: 'VALE-SHARD-DELTA', region: 'SEA (SINGAPORE)', load: 92, status: 'DEGRADED', ccu: 1235 },
];

export const DashboardPage: React.FC = () => {
  const { success, info } = useToast();
  const [broadcasting, setBroadcasting] = useState(false);
  const [quickNotice, setQuickNotice] = useState('');

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNotice.trim()) return;
    setBroadcasting(true);
    setTimeout(() => {
      setBroadcasting(false);
      success(`Directive broadcasted to all active shards: "${quickNotice}"`);
      setQuickNotice('');
    }, 600);
  };

  const handleFlushCache = () => {
    info('Redis routing tables and tactical cache flushed.');
  };

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border-subtle pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="font-data-mono text-xs text-success uppercase tracking-wider font-bold">
              SYSTEM STATUS: FULL SPECTRUM NOMINAL
            </span>
          </div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
            CENTRAL OVERWATCH DASHBOARD
          </h1>
          <p className="text-body-md text-on-surface-variant text-sm mt-0.5">
            High-altitude telemetry, shard health matrices, and tactical command controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFlushCache}
            className="px-3 py-1.5 rounded border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary font-label-caps text-xs flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            Flush Cache
          </button>
          <div className="bg-surface-container px-3 py-1.5 rounded border border-border-subtle font-data-mono text-xs text-primary">
            CYCLE 2026.09 // CL-4
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => (
          <div
            key={metric.title}
            className="bg-surface border border-border-subtle hover:border-primary/50 transition-colors rounded p-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[11px] text-on-surface-variant tracking-wider uppercase">
                {metric.title}
              </span>
              <span className={`material-symbols-outlined text-xl ${metric.indicatorColor}`}>
                {metric.icon}
              </span>
            </div>
            <div className="font-display-lg text-2xl font-bold text-on-surface tracking-tight">
              {metric.value}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-data-mono text-success">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>{metric.change}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
        ))}
      </div>

      {/* Main Grid: Telemetry Activity & Shard Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shard Cluster Health */}
        <div className="lg:col-span-2 bg-surface border border-border-subtle rounded p-5">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">dns</span>
              <h2 className="font-title-sm text-base font-semibold text-on-surface">
                GLOBAL SHARD CLUSTERS
              </h2>
            </div>
            <span className="font-data-mono text-xs text-on-surface-variant">4 NODES ACTIVE</span>
          </div>

          <div className="space-y-3">
            {CLUSTERS.map((shard) => (
              <div
                key={shard.name}
                className="p-3 bg-surface-container rounded border border-border-subtle hover:border-outline-variant transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-data-mono text-xs font-bold text-on-surface">
                      {shard.name}
                    </span>
                    <span
                      className={`font-data-mono text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                        shard.status === 'OPTIMAL'
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-warning/10 text-warning border-warning/30'
                      }`}
                    >
                      {shard.status}
                    </span>
                  </div>
                  <p className="font-data-mono text-[11px] text-on-surface-variant">
                    {shard.region}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-[10px] font-label-caps text-on-surface-variant uppercase">
                      Player Count
                    </div>
                    <div className="font-data-mono text-xs text-primary font-bold">
                      {shard.ccu.toLocaleString()} CCU
                    </div>
                  </div>

                  <div className="w-28 sm:w-36">
                    <div className="flex justify-between text-[10px] font-data-mono text-on-surface-variant mb-1">
                      <span>LOAD</span>
                      <span>{shard.load}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-dim rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          shard.load > 85 ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${shard.load}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tactical Activity Feed */}
          <div className="mt-6 pt-4 border-t border-border-subtle">
            <h3 className="font-label-caps text-xs text-on-surface-variant uppercase mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">feed</span>
              Recent Dispatch Log
            </h3>
            <div className="space-y-2 text-xs font-data-mono">
              <div className="p-2 bg-surface-container-low rounded flex items-center justify-between text-on-surface-variant">
                <span>[14:22:04] Automatic rebalance completed for SECTOR-09.</span>
                <span className="text-success font-bold">ACK</span>
              </div>
              <div className="p-2 bg-surface-container-low rounded flex items-center justify-between text-on-surface-variant">
                <span>[14:18:51] Season VII BattlePass telemetry sync nominal.</span>
                <span className="text-primary font-bold">SYNCED</span>
              </div>
              <div className="p-2 bg-surface-container-low rounded flex items-center justify-between text-on-surface-variant">
                <span>[14:05:12] High traffic surge detected in Frankurt cluster (+18%).</span>
                <span className="text-info font-bold">SCALED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Broadcast & Quick Actions */}
        <div className="space-y-6">
          <div className="bg-surface border border-border-subtle rounded p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-xl">campaign</span>
              <h2 className="font-title-sm text-base font-semibold text-on-surface">
                GLOBAL BROADCAST
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Push emergency directives directly to active operative HUDs.
            </p>

            <form onSubmit={handleBroadcast} className="space-y-3">
              <textarea
                value={quickNotice}
                onChange={(e) => setQuickNotice(e.target.value)}
                placeholder="Type priority dispatch notice..."
                rows={3}
                className="w-full bg-surface-container-lowest border border-border-subtle rounded p-2.5 text-xs font-data-mono text-on-surface focus:border-primary focus:outline-none resize-none placeholder:text-on-surface-variant/50"
              />
              <button
                type="submit"
                disabled={broadcasting || !quickNotice.trim()}
                className="w-full py-2 px-3 bg-primary text-on-primary font-label-caps text-xs rounded hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">send</span>
                {broadcasting ? 'TRANSMITTING...' : 'TRANSMIT DIRECTIVE'}
              </button>
            </form>
          </div>

          <div className="bg-surface border border-border-subtle rounded p-5">
            <h3 className="font-label-caps text-xs text-on-surface-variant uppercase mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">tune</span>
              Fast Protocols
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => info('Anti-cheat heuristic scanner triggered.')}
                className="w-full p-2.5 bg-surface-container hover:bg-surface-container-high rounded border border-border-subtle text-left flex items-center justify-between text-xs text-on-surface transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">security</span>
                  Run Heuristic Audit
                </span>
                <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward</span>
              </button>

              <button
                onClick={() => info('Matchmaking balance weights recalibrated.')}
                className="w-full p-2.5 bg-surface-container hover:bg-surface-container-high rounded border border-border-subtle text-left flex items-center justify-between text-xs text-on-surface transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-tertiary">balance</span>
                  Recalibrate Matchmaker
                </span>
                <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward</span>
              </button>

              <button
                onClick={() => info('Telemetry snapshot archived to persistent storage.')}
                className="w-full p-2.5 bg-surface-container hover:bg-surface-container-high rounded border border-border-subtle text-left flex items-center justify-between text-xs text-on-surface transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-info">archive</span>
                  Snapshot System State
                </span>
                <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
