import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playStyleDistribution, questFunnel } from '../src/features/analytics/analyticsMetrics.ts';
import type { TelemetryEvent } from '../src/features/analytics/analyticsService.ts';

let nextId = 0;
const event = (session_id: string, event_type: string, payload: TelemetryEvent['payload']): TelemetryEvent =>
  ({ id: nextId++, session_id, client_event_id: String(nextId), event_type, map_code: 'map01', pos_x: null, pos_y: null, occurred_at: '', payload });

test('quest funnel counts distinct sessions per step in the defined objective order', () => {
  const q = { quest_code: 'recon' };
  const events = [
    event('s1', 'quest_started', q), event('s2', 'quest_started', q), event('s3', 'quest_started', q),
    event('s1', 'objective_completed', { ...q, objective_id: 'reach' }), event('s1', 'objective_completed', { ...q, objective_id: 'reach' }),
    event('s2', 'objective_completed', { ...q, objective_id: 'reach' }),
    event('s1', 'objective_completed', { ...q, objective_id: 'escape' }), event('s1', 'quest_completed', q),
    event('s1', 'objective_completed', { ...q, objective_id: 'bonus' }),
    event('s4', 'quest_started', { quest_code: 'other' }),
  ];
  assert.deepEqual(questFunnel(events, 'recon', ['reach', 'escape']).map(step => [step.label, step.count]),
    [['Started', 3], ['reach', 2], ['escape', 1], ['bonus', 1], ['Completed', 1]]);
});

test('stealth vs combat groups sessions by their share of takedown kills', () => {
  const kills = [
    event('stealth', 'enemy_killed', { method: 'takedown' }), event('stealth', 'enemy_killed', { method: 'takedown' }),
    event('mostlyStealth', 'enemy_killed', { method: 'takedown' }), event('mostlyStealth', 'enemy_killed', { method: 'weapon' }),
    event('mostlyCombat', 'enemy_killed', { method: 'takedown' }), event('mostlyCombat', 'enemy_killed', { method: 'weapon' }), event('mostlyCombat', 'enemy_killed', { method: 'weapon' }),
    event('combat', 'enemy_killed', { method: 'weapon' }),
  ];
  const result = playStyleDistribution(kills);
  assert.equal(result.sessions, 4);
  assert.deepEqual(result.groups.map(g => g.count), [1, 1, 1, 1]);
  assert.deepEqual(playStyleDistribution([]), { sessions: 0, groups: result.groups.map(g => ({ ...g, count: 0 })) });
});
