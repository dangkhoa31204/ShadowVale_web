import { isDemoMode } from '../../config/environment';


export type SessionOutcome = 'in_progress' | 'completed' | 'died' | 'quit' | 'crashed';
export type SolverFamily = 'classical' | 'quantum_inspired' | 'quantum_hardware';
export type SolverAlgorithm = 'greedy' | 'genetic' | 'classical_sa' | 'qaoa_aer' | 'sqa_neal' | 'qiea' | 'qpu_dwave';
export type CoordinationTask = 'route_coverage' | 'cover_assignment' | 'flanking';
export type EncounterOutcome = 'player_captured' | 'player_escaped' | 'squad_eliminated' | 'aborted';
export interface TelemetrySession {
  id: string; player_id: string | null; content_version_id: string; started_at: string;
  ended_at: string | null; outcome: SessionOutcome; client_version: string; platform: string;
}
export interface TelemetryEvent {
  id: number; session_id: string; client_event_id: string; event_type: string;
  map_code: string | null; pos_x: number | null; pos_y: number | null; occurred_at: string;
  payload: Record<string, string | number | boolean>;
}
export interface SolverConfiguration {
  id: string; code: string; name: string; algorithm: SolverAlgorithm; family: SolverFamily;
  library: string; time_budget_ms: number; is_active: boolean;
}
export interface CoordinationResult {
  id: string; session_id: string; solver_configuration_id: string; map_code: string | null;
  squad_tag: string; task_type: CoordinationTask; num_agents: number; num_nodes: number;
  num_qubo_vars: number; solve_latency_ms: number; within_budget: boolean; used_fallback: boolean;
  coordination_score: number | null; encounter_outcome: EncounterOutcome | null;
  escape_time_ms: number | null; triggered_at: string;
}
export interface AnalyticsData {
  game_sessions: TelemetrySession[]; telemetry_events: TelemetryEvent[];
  solver_configurations: SolverConfiguration[]; coordination_results: CoordinationResult[];
}
export const emptyAnalytics: AnalyticsData = { game_sessions: [], telemetry_events: [], solver_configurations: [], coordination_results: [] };
const algorithms: SolverAlgorithm[] = ['greedy', 'genetic', 'classical_sa', 'qaoa_aer', 'sqa_neal', 'qiea', 'qpu_dwave'];
const families: SolverFamily[] = ['classical', 'classical', 'classical', 'quantum_inspired', 'quantum_inspired', 'quantum_inspired', 'quantum_hardware'];
const outcomes: SessionOutcome[] = ['completed', 'completed', 'completed', 'died', 'quit', 'crashed', 'in_progress'];
const encounters: EncounterOutcome[] = ['player_captured', 'player_escaped', 'squad_eliminated', 'aborted'];
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const analyticsService = {
  load: async (days: number, versionId: string, demoVersionIds: string[] = []): Promise<AnalyticsData> => {
    if (!isDemoMode) throw new Error('Use the aggregate analytics API service.');
    const now = Date.now(), versions = demoVersionIds.length ? demoVersionIds : [uuid(1), uuid(2)];
    const solver_configurations: SolverConfiguration[] = algorithms.map((algorithm, i) => ({
      id: uuid(100 + i), code: algorithm + '_default', name: algorithm.replaceAll('_', ' '), algorithm, family: families[i],
      library: algorithm === 'qaoa_aer' ? 'qiskit-aer' : algorithm === 'sqa_neal' ? 'dwave-neal' : 'custom', time_budget_ms: 100, is_active: true,
    }));
    // Frontend fixtures only. Column names match the DB; records are not live telemetry.
    const game_sessions: TelemetrySession[] = Array.from({ length: 90 }, (_, i) => {
      const outcome = outcomes[i % outcomes.length], started_at = new Date(now - (i % 30) * 86400000).toISOString();
      return { id: uuid(1000 + i), player_id: uuid(2000 + i % 23), content_version_id: versions[i % versions.length], started_at,
        ended_at: outcome === 'in_progress' ? null : new Date(Date.parse(started_at) + 900000).toISOString(), outcome, client_version: '0.3.0', platform: 'windows' };
    }).filter(s => Date.parse(s.started_at) > now - days * 86400000 && (versionId === 'all' || s.content_version_id === versionId));
    const telemetry_events: TelemetryEvent[] = [], coordination_results: CoordinationResult[] = [];
    game_sessions.forEach(session => {
      const i = Number(session.id.slice(-12)) - 1000;
      const map_code = 'map01_docks', occurred_at = new Date(Date.parse(session.started_at) + 60000).toISOString();
      let eventIndex = 0;
      const event = (event_type: string, payload: TelemetryEvent['payload'], pos_x: number | null = null, pos_y: number | null = null) => {
        const id = 4000 + i * 20 + eventIndex++;
        telemetry_events.push({ id, session_id: session.id, client_event_id: uuid(id), event_type, map_code, occurred_at, pos_x, pos_y, payload });
      };
      event('map_enter', {});
      for (let shot = 0; shot < 2 + i % 5; shot++) event('shot_fired', { weapon_code: ['rifle_standard', 'smg_compact', 'pistol_silenced', 'sniper_bolt', 'shotgun_pump'][i % 5] });
      // Player skill levels live in local saves; this is an optional event payload example.
      event('skill_level_changed', { skill_code: ['shooting', 'engineering', 'stealth'][i % 3], level: 1 + i % 5 });
      if (session.outcome === 'died') event('player_died', {}, (i * 13) % 80, (i * 17) % 60);
      const encounter_outcome = encounters[i % encounters.length], latency = 12 + (i * 11 % 150);
      coordination_results.push({ id: uuid(3000 + i), session_id: session.id, solver_configuration_id: solver_configurations[i % algorithms.length].id,
        map_code, squad_tag: 'squad_1', task_type: (['route_coverage', 'cover_assignment', 'flanking'] as const)[i % 3], num_agents: 4 + i % 9,
        num_nodes: 20 + i % 80, num_qubo_vars: 80 + i % 100, solve_latency_ms: latency, within_budget: latency <= 100,
        used_fallback: latency > 100, coordination_score: .45 + (i * 7 % 50) / 100, encounter_outcome,
        escape_time_ms: encounter_outcome === 'player_escaped' ? (120 + i * 37 % 240) * 1000 : null, triggered_at: occurred_at });
    });
    return { game_sessions, telemetry_events, coordination_results, solver_configurations };
  },
};
