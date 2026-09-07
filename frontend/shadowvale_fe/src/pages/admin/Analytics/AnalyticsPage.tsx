import React, { useState } from 'react';
import { useToast } from '../../../components/ui/Toast';

type TimeRange = '24H' | '7D' | '30D' | '90D';

interface RetentionPoint {
  day: string;
  rate: number;
  benchmark: number;
}

const RETENTION_DATA: RetentionPoint[] = [
  { day: 'D1 Retention', rate: 71.4, benchmark: 65.0 },
  { day: 'D3 Retention', rate: 58.2, benchmark: 50.0 },
  { day: 'D7 Retention', rate: 44.6, benchmark: 38.0 },
  { day: 'D14 Retention', rate: 36.1, benchmark: 30.0 },
  { day: 'D30 Retention', rate: 26.8, benchmark: 22.0 },
];

const REGIONS = [
  { name: 'North America (NA-East/West)', share: 38, players: '16,298', status: 'Optimal' },
  { name: 'Western Europe (EU-West)', share: 31, players: '13,296', status: 'Optimal' },
  { name: 'Asia Pacific (AP-East & Tokyo)', share: 21, players: '9,007', status: 'Optimal' },
  { name: 'South America (BR-Central)', share: 7, players: '3,002', status: 'Normal' },
  { name: 'Oceania & Other', share: 3, players: '1,288', status: 'Normal' },
];

export const AnalyticsPage: React.FC = () => {
  const { success } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');

  const handleExport = () => {
    success(`Telemetry dataset (${timeRange}) exported to CSV.`);
  };

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border-subtle pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-base">monitoring</span>
            <span className="font-data-mono text-xs text-primary uppercase tracking-wider font-bold">
              BEHAVIORAL & ECONOMY TELEMETRY
            </span>
          </div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
            OPERATIVE ANALYTICS & RETENTION
          </h1>
          <p className="text-body-md text-on-surface-variant text-sm mt-0.5">
            Deep-dive player cohort progression, in-game sink/faucet liquidity, and regional distributions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex bg-surface-container border border-border-subtle rounded p-0.5 font-label-caps text-xs">
            {(['24H', '7D', '30D', '90D'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded transition-colors ${
                  timeRange === range
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary hover:text-on-primary font-label-caps text-xs flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border-subtle rounded p-4">
          <div className="text-[11px] font-label-caps text-on-surface-variant uppercase">
            Daily Active Operatives (DAU)
          </div>
          <div className="font-display-lg text-2xl font-bold text-on-surface mt-1">
            42,891
          </div>
          <div className="text-xs font-data-mono text-success mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            +8.3% over prior cycle
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded p-4">
          <div className="text-[11px] font-label-caps text-on-surface-variant uppercase">
            Avg Session Duration
          </div>
          <div className="font-display-lg text-2xl font-bold text-on-surface mt-1">
            48m 32s
          </div>
          <div className="text-xs font-data-mono text-primary mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">schedule</span>
            +4m per operative
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded p-4">
          <div className="text-[11px] font-label-caps text-on-surface-variant uppercase">
            Credits Circulating Velocity
          </div>
          <div className="font-display-lg text-2xl font-bold text-on-surface mt-1">
            2.48M CR
          </div>
          <div className="text-xs font-data-mono text-warning mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">swap_vert</span>
            Balanced sink ratio (1.04)
          </div>
        </div>
      </div>

      {/* Retention Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention Cohort Analysis */}
        <div className="bg-surface border border-border-subtle rounded p-5">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
            <h2 className="font-title-sm text-base font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">stacked_line_chart</span>
              COHORT RETENTION DECAY
            </h2>
            <span className="font-data-mono text-xs text-success">EXCEEDING INDUSTRY BENCHMARK</span>
          </div>

          <div className="space-y-4">
            {RETENTION_DATA.map((item) => (
              <div key={item.day} className="space-y-1.5">
                <div className="flex justify-between text-xs font-data-mono">
                  <span className="text-on-surface font-semibold">{item.day}</span>
                  <div className="space-x-2">
                    <span className="text-primary font-bold">{item.rate}%</span>
                    <span className="text-on-surface-variant text-[11px]">(Target: {item.benchmark}%)</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500"
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-3 bg-surface-container rounded text-xs font-body-md text-on-surface-variant flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">lightbulb</span>
            <span>
              Operatives completing the <strong>Vanguard Induction Mission</strong> within 2 hours of account registration show a <strong>+28% D7 retention uplift</strong>.
            </span>
          </div>
        </div>

        {/* Global Regional Distribution */}
        <div className="bg-surface border border-border-subtle rounded p-5">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
            <h2 className="font-title-sm text-base font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">public</span>
              REGIONAL OPERATIVE POPULATION
            </h2>
            <span className="font-data-mono text-xs text-on-surface-variant">5 MAJOR THEATRES</span>
          </div>

          <div className="space-y-3.5">
            {REGIONS.map((region) => (
              <div key={region.name} className="p-3 bg-surface-container rounded border border-border-subtle">
                <div className="flex justify-between items-center text-xs font-data-mono mb-1">
                  <span className="text-on-surface font-medium">{region.name}</span>
                  <div className="space-x-3">
                    <span className="text-primary font-bold">{region.share}%</span>
                    <span className="text-on-surface-variant">{region.players} active</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-surface-dim rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${region.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
