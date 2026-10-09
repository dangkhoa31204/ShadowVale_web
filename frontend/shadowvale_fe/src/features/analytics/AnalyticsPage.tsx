import { useEffect, useState } from 'react';
import { analyticsService, emptyAnalytics, type AnalyticsData, type CoordinationTask, type SolverFamily } from './analyticsService';
import { isDemoMode } from '../../config/environment';
import { Empty, Icon, PageHeading } from '../shared/ui';
import { downloadJson } from '../shared/format';
import { useWorkspace } from '../content/workspaceContext';

function percent(value: number, total: number) { return total ? (100 * value / total).toFixed(1) + '%' : '—'; }
function mean(values: number[], digits = 1) { return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(digits) : '—'; }
const familyLabels: Record<SolverFamily, string> = { classical: 'Classical', quantum_inspired: 'Quantum inspired', quantum_hardware: 'Quantum hardware' };
const taskLabels: Record<CoordinationTask, string> = { route_coverage: 'Route coverage', cover_assignment: 'Cover assignment', flanking: 'Flanking' };
const outcomeLabels = { in_progress: 'In progress', completed: 'Completed', died: 'Died', quit: 'Quit', crashed: 'Crashed' };

export function InternalAnalyticsPage() {
  const { state } = useWorkspace();
  const [days, setDays] = useState(7), [version, setVersion] = useState('all');
  const [telemetry, setTelemetry] = useState<AnalyticsData>(emptyAnalytics), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [mapFilter, setMapFilter] = useState('all');
  const [familyFilter, setFamilyFilter] = useState('all'), [taskFilter, setTaskFilter] = useState('all');
  const demoVersionIds = state.releases.map(r => r.id).join(',');
  useEffect(() => {
    let active = true;
    analyticsService.load(days, version, demoVersionIds.split(',').filter(Boolean)).then(data => { if (active) { setTelemetry(data); setError(''); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load telemetry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days, version, retry, demoVersionIds]);
  const maps = [...new Set(telemetry.telemetry_events.map(e => e.map_code).concat(telemetry.coordination_results.map(r => r.map_code)).filter((code): code is string => code !== null))];
  const events = telemetry.telemetry_events.filter(e => mapFilter === 'all' || e.map_code === mapFilter);
  const sessionIds = new Set(events.map(e => e.session_id).concat(telemetry.coordination_results.filter(r => mapFilter === 'all' || r.map_code === mapFilter).map(r => r.session_id)));
  const sessions = telemetry.game_sessions.filter(s => mapFilter === 'all' || sessionIds.has(s.id));
  const closedSessions = sessions.filter(s => s.outcome !== 'in_progress');
  const configurations = telemetry.solver_configurations.filter(c => familyFilter === 'all' || c.family === familyFilter);
  const configurationIds = new Set(configurations.map(c => c.id));
  const results = telemetry.coordination_results.filter(r => (mapFilter === 'all' || r.map_code === mapFilter) && configurationIds.has(r.solver_configuration_id) && (taskFilter === 'all' || r.task_type === taskFilter));
  const encounters = results.filter(r => r.encounter_outcome !== null && r.encounter_outcome !== 'aborted');
  const shots = events.filter(e => e.event_type === 'shot_fired' && typeof e.payload.weapon_code === 'string');
  const weaponCodes = [...new Set(shots.map(e => String(e.payload.weapon_code)))];
  const deaths = events.filter(e => e.event_type === 'player_died' && e.pos_x !== null && e.pos_y !== null);
  const minX = Math.min(0, ...deaths.map(e => e.pos_x!)), minY = Math.min(0, ...deaths.map(e => e.pos_y!));
  const maxX = Math.max(minX + 1, ...deaths.map(e => e.pos_x!)), maxY = Math.max(minY + 1, ...deaths.map(e => e.pos_y!));
  const cellWidth = (maxX - minX) / 8, cellHeight = (maxY - minY) / 6;
  const skills = events.filter(e => e.event_type === 'skill_level_changed' && typeof e.payload.skill_code === 'string' && typeof e.payload.level === 'number');
  const activeBundle = state.releases.find(r => r.id === state.activeReleaseId)?.bundle;
  const mapName = (code: string) => String(activeBundle?.maps.find(m => m.code === code)?.name || code);
  const itemName = (code: string) => String(activeBundle?.items.find(i => i.code === code)?.name || code);
  const exportData = { game_sessions: sessions, telemetry_events: events, solver_configurations: configurations, coordination_results: results };

  return <div className="sv-page">
    <PageHeading eyebrow="ANALYST" title="Analytics" description="Sessions, telemetry events and squad coordination." action={<button className="sv-button" disabled={loading || !!error || !sessions.length} onClick={() => downloadJson(exportData, 'shadowvale-telemetry-' + days + 'd.json')}><Icon name="download" />Export JSON</button>} />
    {isDemoMode && <div className="sv-alert">Demo data · sample sessions and events.</div>}
    <div className="sv-analytics-filters sv-form">
      <div className="sv-segmented">{[7, 30].map(d => <button className={days === d ? 'is-active' : ''} key={d} onClick={() => { if (d !== days) { setLoading(true); setDays(d); } }}>{d} days</button>)}</div>
      <label>Content version<select value={version} onChange={e => { setLoading(true); setVersion(e.target.value); setMapFilter('all'); }}><option value="all">All versions</option>{state.releases.map(r => <option key={r.id} value={r.id}>#{r.version_no} · {r.label}</option>)}</select></label>
      <label>Map<select value={mapFilter} onChange={e => setMapFilter(e.target.value)}><option value="all">All maps</option>{maps.map(m => <option key={m} value={m}>{mapName(m)}</option>)}</select></label>
    </div>
    {loading ? <div className="portal-state" role="status">Loading telemetry…</div> : error ? <div className="sv-alert sv-alert-error" role="alert">{error}<button className="sv-button" onClick={() => { setLoading(true); setRetry(retry + 1); }}>Try again</button></div> : !sessions.length ? <Empty title="No telemetry" description="Choose another date range, content version or map." /> : <>
      <div className="sv-stats-grid">{[
        { label: 'Game sessions', value: sessions.length, detail: 'game_sessions' },
        { label: 'Session completion', value: percent(closedSessions.filter(s => s.outcome === 'completed').length, closedSessions.length), detail: 'Completed / ended sessions' },
        { label: 'Encounter capture rate', value: percent(encounters.filter(r => r.encounter_outcome === 'player_captured').length, encounters.length), detail: 'Aborted encounters excluded' },
        { label: 'Within time budget', value: percent(results.filter(r => r.within_budget).length, results.length), detail: 'coordination_results.within_budget' },
      ].map(s => <article className="sv-stat" key={s.label}><span>{s.label}</span><strong>{s.value}</strong><small>{s.detail}</small></article>)}</div>
      <div className="sv-dashboard-columns">
        <section className="sv-panel"><div className="sv-panel-heading"><div><h2>Session outcomes</h2><p>game_sessions.outcome</p></div></div><div className="sv-bars">{Object.entries(outcomeLabels).map(([outcome, label]) => {
          const count = sessions.filter(s => s.outcome === outcome).length;
          return <div key={outcome}><div><strong>{label}</strong><span>{count} · {percent(count, sessions.length)}</span></div><div className="sv-bar-track"><span style={{ width: (100 * count / sessions.length) + '%' }} /></div></div>;
        })}</div></section>
        <section className="sv-panel"><div className="sv-panel-heading"><div><h2>Weapon usage</h2><p>shot_fired · payload.weapon_code → weapons.item_code</p></div></div>{shots.length ? <div className="sv-bars">{weaponCodes.map(code => {
          const count = shots.filter(e => e.payload.weapon_code === code).length;
          return <div key={code}><div><strong>{itemName(code)} <small className="sv-mono">{code}</small></strong><span>{count} shots · {percent(count, shots.length)}</span></div><div className="sv-bar-track"><span style={{ width: (100 * count / shots.length) + '%' }} /></div></div>;
        })}</div> : <Empty title="No weapon events" description="Weapon usage comes from shot_fired telemetry." />}</section>
      </div>
      <section className="sv-panel">
        <div className="sv-panel-heading"><div><h2>Solver comparison</h2><p>solver_configurations · coordination_results</p></div><Icon name="neurology" /></div>
        <div className="sv-analytics-filters sv-form">
          <label>Solver family<select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}><option value="all">All families</option>{Object.entries(familyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Coordination task<select value={taskFilter} onChange={e => setTaskFilter(e.target.value)}><option value="all">All tasks</option>{Object.entries(taskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>Algorithm / configuration</th><th>Results</th><th>Capture rate</th><th>Escape time (ms)</th><th>Coordination score</th><th>Latency p95 (ms)</th><th>Within budget</th><th>Fallback</th></tr></thead><tbody>{configurations.map(config => {
          const rows = results.filter(r => r.solver_configuration_id === config.id), validEncounters = rows.filter(r => r.encounter_outcome !== null && r.encounter_outcome !== 'aborted');
          const latencies = rows.map(r => r.solve_latency_ms).sort((a, b) => a - b);
          return <tr key={config.id}><td><strong className="sv-mono">{config.algorithm}</strong><small>{config.code} · {familyLabels[config.family]}</small></td><td>{rows.length}</td><td>{percent(validEncounters.filter(r => r.encounter_outcome === 'player_captured').length, validEncounters.length)}</td><td>{mean(rows.flatMap(r => r.encounter_outcome === 'player_escaped' && r.escape_time_ms !== null ? [r.escape_time_ms] : []), 0)}</td><td>{mean(rows.flatMap(r => r.coordination_score !== null ? [r.coordination_score] : []), 2)}</td><td>{latencies.length ? latencies[Math.ceil(latencies.length * .95) - 1].toFixed(1) : '—'}</td><td>{percent(rows.filter(r => r.within_budget).length, rows.length)}</td><td>{percent(rows.filter(r => r.used_fallback).length, rows.length)}</td></tr>;
        })}</tbody></table></div>
      </section>
      <div className="sv-dashboard-columns">
        <section className="sv-panel"><div className="sv-panel-heading"><div><h2>Death locations</h2><p>player_died · pos_x / pos_y</p></div></div>{mapFilter === 'all' ? <Empty title="Select a map" description="Choose one map to view spatial events." /> : <div className="sv-heatmap-area"><div className="sv-heatmap" aria-label="Player death heatmap">{Array.from({ length: 48 }, (_, i) => {
          const x = i % 8, y = Math.floor(i / 8), count = deaths.filter(d => Math.min(7, Math.floor((d.pos_x! - minX) / cellWidth)) === x && Math.min(5, Math.floor((d.pos_y! - minY) / cellHeight)) === y).length;
          return <div key={i} title={`X ${(minX + x * cellWidth).toFixed(1)}–${(minX + (x + 1) * cellWidth).toFixed(1)}, Y ${(minY + y * cellHeight).toFixed(1)}–${(minY + (y + 1) * cellHeight).toFixed(1)}: ${count} deaths`} style={{ backgroundColor: count ? `rgba(249, 149, 90, ${Math.min(.95, .25 + count * .18)})` : '#202931' }}>{count || '·'}</div>;
        })}</div><small>0 deaths <span className="sv-heat-legend" /> More deaths</small></div>}</section>
        <section className="sv-panel"><div className="sv-panel-heading"><div><h2>Skill event levels</h2><p>skill_level_changed · payload.skill_code / level</p></div></div>{skills.length ? <div className="sv-bars">{(['shooting', 'engineering', 'stealth'] as const).map(skill => {
          const values = skills.filter(e => e.payload.skill_code === skill).map(e => Number(e.payload.level));
          const maxLevel = Number(activeBundle?.skills.find(s => s.code === skill)?.max_level || 10);
          return <div key={skill}><div><strong>{skill}</strong><span>Level {mean(values)} · {values.length} events</span></div><div className="sv-bar-track"><span style={{ width: Math.min(100, Number(mean(values)) / maxLevel * 100 || 0) + '%' }} /></div></div>;
        })}</div> : <Empty title="No skill events" description="Skill levels are kept in the player's local save." />}<p className="sv-table-note">Event averages only. Player skill and quest progress remain in local saves.</p></section>
      </div>
    </>}
  </div>;
}
