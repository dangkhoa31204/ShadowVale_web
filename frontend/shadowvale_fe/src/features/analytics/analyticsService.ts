import { isDemoMode } from '../../config/environment';
import { axiosClient } from '../../services/api/axiosClient';
export interface TelemetrySession {
  id: string; at: string; contentVersion: string; map: string; solver: string; completed: boolean;
  captured: boolean; escapeSeconds: number; coordinationScore: number; latencyMs: number;
  weapon: string; stealth: boolean; skill: 'shooting' | 'engineering' | 'stealth'; skillLevel: number;
  deaths: { x: number; y: number }[];
}
export const analyticsService = {
  load: async (days: number, version: string): Promise<TelemetrySession[]> => {
    if (!isDemoMode) return (await axiosClient.get<TelemetrySession[]>('/telemetry/analytics/sessions', { params: { days, content_version: version === 'all' ? undefined : version } })).data;
    // Synthetic, deterministic examples only; no research or live-player claims.
    const versions = ['1.0.0', '1.1.0'], solvers = ['greedy', 'ga', 'sqa', 'qiea', 'qaoa'];
    const now = Date.now();
    return Array.from({ length: 90 }, (_, i) => ({
      id: 'sample-' + i, at: new Date(now - (i % 30) * 86400000).toISOString(),
      contentVersion: versions[i % 2], map: i % 3 ? 'Map 01 · Ashfall' : 'Map 02 · Outpost', solver: solvers[i % 5],
      completed: i % 4 !== 0, captured: i % 3 === 0, escapeSeconds: 120 + (i * 37) % 240,
      coordinationScore: 0.45 + (i * 7 % 50) / 100, latencyMs: 12 + (i * 11 % 150),
      weapon: ['Service Rifle', 'Compact SMG', 'Silenced Pistol', 'Bolt Rifle', 'Pump Shotgun'][i % 5],
      stealth: i % 3 === 1, skill: (['shooting', 'engineering', 'stealth'] as const)[i % 3], skillLevel: 1 + i % 5,
      deaths: i % 4 === 0 ? [{ x: i * 3 % 8, y: Math.floor(i / 8) % 6 }] : [],
    })).filter(s => Date.parse(s.at) > now - days * 86400000 && (version === 'all' || s.contentVersion === version));
  },
};
