import React, { useState } from 'react';
import { useToast } from '../../../components/ui/Toast';

interface LiveEvent {
  id: string;
  name: string;
  code: string;
  type: 'MULTIPLIER' | 'INCURSION' | 'RAID' | 'MARKET';
  status: 'ACTIVE' | 'SCHEDULED' | 'STANDBY';
  countdown: string;
  multiplier?: string;
}

const INITIAL_EVENTS: LiveEvent[] = [
  {
    id: 'evt-101',
    name: 'ECLIPSE PROTOCOL: OVERDRIVE',
    code: 'EVT-XP-200',
    type: 'MULTIPLIER',
    status: 'ACTIVE',
    countdown: '03h 41m 12s',
    multiplier: '2.5x EXP & CREDITS',
  },
  {
    id: 'evt-102',
    name: 'NIGHT RAID: SECTOR-ZERO SIEGE',
    code: 'EVT-RAID-09',
    type: 'RAID',
    status: 'SCHEDULED',
    countdown: 'Starts in 01h 15m',
  },
  {
    id: 'evt-103',
    name: 'BLACK MARKET SURGE AUCTION',
    code: 'EVT-MKT-FLX',
    type: 'MARKET',
    status: 'STANDBY',
    countdown: 'Ready for Trigger',
  },
];

interface ShardInstance {
  id: string;
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  uptime: string;
  tickRate: number;
  health: 'STABLE' | 'WARNING';
}

const INITIAL_SHARDS: ShardInstance[] = [
  { id: 'inst-991', name: 'US-EAST-SHARD-01', map: 'Vale Citadel Ruins', players: 124, maxPlayers: 128, uptime: '48h 12m', tickRate: 64, health: 'STABLE' },
  { id: 'inst-992', name: 'US-EAST-SHARD-02', map: 'Cyber Bastion District', players: 110, maxPlayers: 128, uptime: '22h 05m', tickRate: 63.8, health: 'STABLE' },
  { id: 'inst-993', name: 'EU-CENTRAL-SHARD-01', map: 'Vale Citadel Ruins', players: 128, maxPlayers: 128, uptime: '11h 30m', tickRate: 60.1, health: 'WARNING' },
  { id: 'inst-994', name: 'AP-TOKYO-SHARD-01', map: 'Neon Trenchway', players: 84, maxPlayers: 128, uptime: '64h 19m', tickRate: 64, health: 'STABLE' },
];

export const LiveOpsPage: React.FC = () => {
  const { success, warning, info } = useToast();
  const [events, setEvents] = useState<LiveEvent[]>(INITIAL_EVENTS);
  const [shards, setShards] = useState<ShardInstance[]>(INITIAL_SHARDS);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  const toggleEventStatus = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const nextStatus = e.status === 'ACTIVE' ? 'STANDBY' : 'ACTIVE';
          if (nextStatus === 'ACTIVE') {
            success(`Live event [${e.name}] ACTIVATED globally.`);
          } else {
            info(`Live event [${e.name}] DEACTIVATED.`);
          }
          return { ...e, status: nextStatus };
        }
        return e;
      })
    );
  };

  const handleRestartShard = (shardName: string) => {
    info(`Graceful drain signal issued to ${shardName}. Transferring operatives...`);
    setShards((prev) =>
      prev.map((s) =>
        s.name === shardName ? { ...s, health: 'WARNING' as const } : s
      )
    );
  };


  const handleTriggerEmergencyLockdown = () => {
    setEmergencyModalOpen(false);
    warning('EMERGENCY LOCKDOWN PROTOCOL INITIATED. All public matchmaking ingress disabled.');
  };

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border-subtle pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-base">sensors</span>
            <span className="font-data-mono text-xs text-primary uppercase tracking-wider font-bold">
              REAL-TIME ORCHESTRATION
            </span>
          </div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
            LIVE OPERATIONS & GAMEWORLD SHARDS
          </h1>
          <p className="text-body-md text-on-surface-variant text-sm mt-0.5">
            Active game servers, scheduled live-ops events, in-game multipliers, and killswitch commands.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setEmergencyModalOpen(true)}
            className="px-3 py-1.5 rounded border border-error/50 bg-error/10 hover:bg-error hover:text-on-error text-error font-label-caps text-xs flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Emergency Lockdown
          </button>
        </div>
      </div>

      {/* Live Events Management */}
      <div className="bg-surface border border-border-subtle rounded p-5">
        <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
          <h2 className="font-title-sm text-base font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">event_available</span>
            GLOBAL LIVE-OPS CAMPAIGNS & MODIFIERS
          </h2>
          <span className="font-data-mono text-xs text-primary">LIVE ENGINE SYNC</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {events.map((evt) => {
            const isActive = evt.status === 'ACTIVE';
            return (
              <div
                key={evt.id}
                className={`p-4 rounded border transition-all ${
                  isActive
                    ? 'bg-surface-container border-primary/60 shadow-lg'
                    : 'bg-surface-container-low border-border-subtle opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-data-mono text-[10px] text-on-surface-variant bg-surface-dim px-2 py-0.5 rounded border border-border-subtle">
                    {evt.code}
                  </span>
                  <span
                    className={`font-data-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      isActive
                        ? 'bg-success/20 text-success border border-success/30'
                        : evt.status === 'SCHEDULED'
                        ? 'bg-info/20 text-info border border-info/30'
                        : 'bg-surface-variant text-on-surface-variant'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>

                <h3 className="font-title-sm text-sm font-bold text-on-surface mb-1">
                  {evt.name}
                </h3>

                {evt.multiplier && (
                  <div className="font-data-mono text-xs text-tertiary font-bold mb-2">
                    {evt.multiplier}
                  </div>
                )}

                <div className="text-[11px] font-data-mono text-on-surface-variant mb-4 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">timer</span>
                  {evt.countdown}
                </div>

                <button
                  onClick={() => toggleEventStatus(evt.id)}
                  className={`w-full py-1.5 px-3 rounded font-label-caps text-xs flex items-center justify-center gap-2 transition-colors ${
                    isActive
                      ? 'border border-error/50 text-error hover:bg-error/10'
                      : 'border border-primary text-primary hover:bg-primary hover:text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isActive ? 'stop_circle' : 'play_circle'}
                  </span>
                  {isActive ? 'HALT EVENT' : 'TRIGGER EVENT'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gameworld Shards Table */}
      <div className="bg-surface border border-border-subtle rounded p-5">
        <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
          <h2 className="font-title-sm text-base font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">router</span>
            DEDICATED INSTANCE FLEET
          </h2>
          <span className="font-data-mono text-xs text-on-surface-variant">
            {shards.length} INSTANCES ACTIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-data-mono">
            <thead>
              <tr className="border-b border-border-subtle text-on-surface-variant font-label-caps uppercase text-[11px]">
                <th className="pb-3 px-3">Shard Identifier</th>
                <th className="pb-3 px-3">Map Sector</th>
                <th className="pb-3 px-3">Population</th>
                <th className="pb-3 px-3">Tickrate</th>
                <th className="pb-3 px-3">Uptime</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {shards.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container transition-colors">
                  <td className="py-3 px-3 text-on-surface font-bold">
                    {s.name}
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant">
                    {s.map}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-primary font-bold">{s.players}</span>
                    <span className="text-on-surface-variant"> / {s.maxPlayers}</span>
                  </td>
                  <td className="py-3 px-3 text-on-surface">
                    {s.tickRate} Hz
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant">
                    {s.uptime}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.health === 'STABLE'
                          ? 'bg-success/10 text-success border border-success/30'
                          : 'bg-warning/10 text-warning border border-warning/30'
                      }`}
                    >
                      {s.health}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleRestartShard(s.name)}
                      className="px-2 py-1 rounded border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary transition-colors text-[11px] font-label-caps"
                    >
                      Drain / Restart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Lockdown Modal */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-error max-w-md w-full rounded p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 text-error mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <div>
                <h3 className="font-title-sm text-base font-bold text-on-surface">
                  INITIATE EMERGENCY LOCKDOWN?
                </h3>
                <p className="font-data-mono text-xs text-error">CODE RED PROTOCOL</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              This action terminates all matchmaking match queues immediately and places all regional gateways into offline maintenance mode. Active sessions will have 60 seconds before disconnect.
            </p>

            <div className="flex justify-end gap-3 font-label-caps text-xs">
              <button
                onClick={() => setEmergencyModalOpen(false)}
                className="px-4 py-2 rounded border border-border-subtle text-on-surface-variant hover:text-on-surface"
              >
                ABORT
              </button>
              <button
                onClick={handleTriggerEmergencyLockdown}
                className="px-4 py-2 rounded bg-error text-white hover:bg-error-container font-bold transition-colors"
              >
                CONFIRM LOCKDOWN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveOpsPage;
