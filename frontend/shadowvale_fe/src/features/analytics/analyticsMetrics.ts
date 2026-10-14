import type { TelemetryEvent } from './analyticsService';

export interface FunnelStep { label: string; objectiveId?: string; count: number }

/**
 * Sessions reaching each step of one quest: started, every objective, completed.
 * Objectives follow the quest definition; ones only seen in telemetry follow in logged order.
 */
export function questFunnel(events: TelemetryEvent[], questCode: string, objectiveOrder: string[]): FunnelStep[] {
  const quest = events.filter(e => e.payload.quest_code === questCode);
  const logged = quest.filter(e => e.event_type === 'objective_completed').map(e => String(e.payload.objective_id));
  const sessions = (eventType: string, objectiveId?: string) => new Set(quest
    .filter(e => e.event_type === eventType && (objectiveId === undefined || e.payload.objective_id === objectiveId))
    .map(e => e.session_id)).size;
  return [
    { label: 'Started', count: sessions('quest_started') },
    ...[...new Set([...objectiveOrder, ...logged])].map(id => ({ label: id, objectiveId: id, count: sessions('objective_completed', id) })),
    { label: 'Completed', count: sessions('quest_completed') },
  ];
}

// Sessions are grouped by their share of kills made with takedowns; sessions without kills are left out.
const playStyles = [
  { label: 'Stealth only', matches: (share: number) => share === 1 },
  { label: 'Mostly stealth', matches: (share: number) => share >= .5 && share < 1 },
  { label: 'Mostly combat', matches: (share: number) => share > 0 && share < .5 },
  { label: 'Combat only', matches: (share: number) => share === 0 },
];

/** Stealth vs combat split from enemy_killed events (payload.method is "takedown" or "weapon"). */
export function playStyleDistribution(kills: TelemetryEvent[]) {
  const bySession = new Map<string, { takedowns: number; total: number }>();
  for (const kill of kills) {
    const entry = bySession.get(kill.session_id) ?? { takedowns: 0, total: 0 };
    entry.total++;
    if (kill.payload.method === 'takedown') entry.takedowns++;
    bySession.set(kill.session_id, entry);
  }
  const shares = [...bySession.values()].map(entry => entry.takedowns / entry.total);
  return { sessions: shares.length, groups: playStyles.map(style => ({ label: style.label, count: shares.filter(style.matches).length })) };
}
