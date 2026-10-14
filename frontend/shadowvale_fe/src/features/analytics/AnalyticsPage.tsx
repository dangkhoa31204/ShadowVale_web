import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { playStyleDistribution, questFunnel } from './analyticsMetrics';
import { analyticsService, emptyAnalytics, type CoordinationTask, type SolverFamily } from './analyticsService';
import { HorizontalBars } from './charts';
import { ApiAnalyticsPage } from './ApiAnalyticsPage';
import { isDemoMode } from '../../config/environment';
import { Empty, PageHeading, Panel, panelTable } from '../shared/ui';
import { useWorkspace } from '../content/workspaceContext';

function percent(value: number, total: number) { return total ? (100 * value / total).toFixed(1) + '%' : '—'; }
function mean(values: number[], digits = 1) { return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(digits) : '—'; }
const familyLabels: Record<SolverFamily, string> = { classical: 'Classical', quantum_inspired: 'Quantum inspired', quantum_hardware: 'Quantum hardware' };
const taskLabels: Record<CoordinationTask, string> = { route_coverage: 'Route coverage', cover_assignment: 'Cover assignment', flanking: 'Flanking' };
const heatLayers = { player_died: 'Deaths', player_spotted: 'Detections' } as const;
type HeatLayer = keyof typeof heatLayers;
const humanize = (code: string) => code.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase());

export function InternalAnalyticsPage() { return isDemoMode ? <DemoAnalyticsPage /> : <ApiAnalyticsPage />; }
function DemoAnalyticsPage() {
  const { state } = useWorkspace();
  const [days, setDays] = useState(7), [version, setVersion] = useState('all');
  const [mapFilter, setMapFilter] = useState('all');
  const [familyFilter, setFamilyFilter] = useState('all'), [taskFilter, setTaskFilter] = useState('all');
  const [questFilter, setQuestFilter] = useState(''), [heatLayer, setHeatLayer] = useState<HeatLayer>('player_died');
  const demoVersionIds = state.releases.map(r => r.id);
  // Changing a filter keeps the previous numbers on screen (dimmed) until the new slice arrives.
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['analytics', days, version, demoVersionIds],
    queryFn: () => analyticsService.load(days, version, demoVersionIds),
    placeholderData: keepPreviousData,
  });
  const telemetry = data ?? emptyAnalytics;
  const maps = [...new Set(telemetry.telemetry_events.map(e => e.map_code).concat(telemetry.coordination_results.map(r => r.map_code)).filter((code): code is string => code !== null))];
  const events = telemetry.telemetry_events.filter(e => mapFilter === 'all' || e.map_code === mapFilter);
  const sessionIds = new Set(events.map(e => e.session_id).concat(telemetry.coordination_results.filter(r => mapFilter === 'all' || r.map_code === mapFilter).map(r => r.session_id)));
  const sessions = telemetry.game_sessions.filter(s => mapFilter === 'all' || sessionIds.has(s.id));
  const configurations = telemetry.solver_configurations.filter(c => familyFilter === 'all' || c.family === familyFilter);
  const configurationIds = new Set(configurations.map(c => c.id));
  const results = telemetry.coordination_results.filter(r => (mapFilter === 'all' || r.map_code === mapFilter) && configurationIds.has(r.solver_configuration_id) && (taskFilter === 'all' || r.task_type === taskFilter));
  const shots = events.filter(e => e.event_type === 'shot_fired' && typeof e.payload.weapon_code === 'string');
  const weaponCodes = [...new Set(shots.map(e => String(e.payload.weapon_code)))];
  // Both heat map layers share one grid so switching layers keeps cells in place.
  const positioned = events.filter(e => e.event_type in heatLayers && e.pos_x !== null && e.pos_y !== null);
  const heatPoints = positioned.filter(e => e.event_type === heatLayer);
  const minX = Math.min(0, ...positioned.map(e => e.pos_x!)), minY = Math.min(0, ...positioned.map(e => e.pos_y!));
  const maxX = Math.max(minX + 1, ...positioned.map(e => e.pos_x!)), maxY = Math.max(minY + 1, ...positioned.map(e => e.pos_y!));
  const cellWidth = (maxX - minX) / 8, cellHeight = (maxY - minY) / 6;
  const activeBundle = state.releases.find(r => r.id === state.activeReleaseId)?.bundle;
  const mapName = (code: string) => String(activeBundle?.maps.find(m => m.code === code)?.name || code);
  const itemName = (code: string) => String(activeBundle?.items.find(i => i.code === code)?.name || code);
  const questEvents = events.filter(e => typeof e.payload.quest_code === 'string');
  const questCodes = [...new Set(questEvents.map(e => String(e.payload.quest_code)))];
  const quest = questCodes.includes(questFilter) ? questFilter : questCodes[0] || '';
  const questRecord = activeBundle?.quests.find(q => q.code === quest);
  const questName = (code: string) => String(activeBundle?.quests.find(q => q.code === code)?.title || code);
  const objectiveOrder = Array.isArray(questRecord?.objectives) ? questRecord.objectives.flatMap(o => o && typeof o === 'object' && !Array.isArray(o) && typeof o.id === 'string' ? [o.id] : []) : [];
  const funnel = questFunnel(questEvents, quest, objectiveOrder).map(step => ({ ...step, label: step.objectiveId ? humanize(step.objectiveId) : step.label }));
  const kills = events.filter(e => e.event_type === 'enemy_killed' && typeof e.payload.method === 'string');
  const takedowns = kills.filter(e => e.payload.method === 'takedown').length;
  const styles = playStyleDistribution(kills);

  const weaponRows = weaponCodes.map(code => {
    const count = shots.filter(e => e.payload.weapon_code === code).length;
    return { label: itemName(code), value: count, detail: count + ' shots · ' + percent(count, shots.length) };
  });
  const funnelRows = funnel.map((step, i) => ({
    label: step.label, value: step.count,
    detail: step.count + ' · ' + percent(step.count, funnel[0].count) + (i > 0 && funnel[i - 1].count > step.count ? ' · −' + percent(funnel[i - 1].count - step.count, funnel[i - 1].count) : ''),
  }));
  const styleRows = styles.groups.map(group => ({ label: group.label, value: group.count, detail: group.count + ' · ' + percent(group.count, styles.sessions) }));
  const heatLabel = heatLayers[heatLayer].toLowerCase();

  return <div className="sv-page">
    <PageHeading eyebrow="ANALYST" title="Analytics" description="Sessions, telemetry events and squad coordination." />
    <Alert><AlertDescription>Demo data · sample sessions and events.</AlertDescription></Alert>
    <div className="flex flex-wrap items-end gap-4">
      <ToggleGroup type="single" variant="outline" spacing={0} value={String(days)} onValueChange={value => { if (value) setDays(Number(value)); }} aria-label="Date range">
        {[7, 30].map(d => <ToggleGroupItem key={d} value={String(d)} className="px-4">{d} days</ToggleGroupItem>)}
      </ToggleGroup>
      <Field className="w-56"><FieldLabel htmlFor="analytics-version">Content version</FieldLabel>
        <NativeSelect id="analytics-version" className="w-full" value={version} onChange={e => { setVersion(e.target.value); setMapFilter('all'); }}><NativeSelectOption value="all">All versions</NativeSelectOption>{state.releases.map(r => <NativeSelectOption key={r.id} value={r.id}>#{r.version_no} · {r.label}</NativeSelectOption>)}</NativeSelect>
      </Field>
      <Field className="w-48"><FieldLabel htmlFor="analytics-map">Map</FieldLabel>
        <NativeSelect id="analytics-map" className="w-full" value={mapFilter} onChange={e => setMapFilter(e.target.value)}><NativeSelectOption value="all">All maps</NativeSelectOption>{maps.map(m => <NativeSelectOption key={m} value={m}>{mapName(m)}</NativeSelectOption>)}</NativeSelect>
      </Field>
      {isFetching && !isPending && <span className="flex items-center gap-2 pb-2 text-xs text-muted-foreground"><Spinner />Updating…</span>}
    </div>
    {isPending ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground" role="status"><Spinner />Loading telemetry…</div>
      : error ? <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-4 text-destructive">{error instanceof Error ? error.message : 'Could not load telemetry.'}<Button variant="outline" size="sm" onClick={() => void refetch()}>Try again</Button></AlertDescription></Alert>
      : !sessions.length ? <Empty title="No telemetry" description="Choose another date range, content version or map." />
      : <div className={cn('sv-page transition-opacity', isFetching && 'opacity-60')}>
        <div className="grid gap-5">
          <Panel title="Weapon usage" description="Shots per weapon · shot_fired.payload.weapon_code">
            {shots.length ? <HorizontalBars rows={weaponRows} unit="Shots" /> : <Empty title="No weapon events" description="Weapon usage comes from shot_fired telemetry." />}
          </Panel>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Mission completion funnel" description="Sessions per step · quest_started → objective_completed → quest_completed"
            action={questCodes.length > 1 && <NativeSelect aria-label="Quest" size="sm" value={quest} onChange={e => setQuestFilter(e.target.value)}>{questCodes.map(code => <NativeSelectOption key={code} value={code}>{questName(code)}</NativeSelectOption>)}</NativeSelect>}>
            {funnel[0].count ? <>
              <p className="px-6 pb-2 text-xs text-muted-foreground">{questName(quest)} <span className="font-mono">{quest}</span> · each bar shows sessions, share of starts and drop from the previous step</p>
              <HorizontalBars rows={funnelRows} unit="Sessions" />
            </> : <Empty title="No quest events" description="The funnel comes from quest_started, objective_completed and quest_completed telemetry." />}
          </Panel>
          <Panel title="Stealth vs combat" description="Sessions by share of takedown kills · enemy_killed.payload.method">
            {kills.length ? <>
              <p className="px-6 pb-2 text-xs text-muted-foreground">Takedowns {percent(takedowns, kills.length)} of {kills.length} kills · {styles.sessions} sessions with kills</p>
              <HorizontalBars rows={styleRows} unit="Sessions" />
            </> : <Empty title="No kill events" description="The split comes from enemy_killed telemetry." />}
          </Panel>
        </div>
        <Panel title="Solver comparison" description="solver_configurations · coordination_results" action={<div className="flex flex-wrap gap-2">
          <NativeSelect aria-label="Solver family" size="sm" value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}><NativeSelectOption value="all">All families</NativeSelectOption>{Object.entries(familyLabels).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</NativeSelect>
          <NativeSelect aria-label="Coordination task" size="sm" value={taskFilter} onChange={e => setTaskFilter(e.target.value)}><NativeSelectOption value="all">All tasks</NativeSelectOption>{Object.entries(taskLabels).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</NativeSelect>
        </div>}>
          <Table className={cn(panelTable, 'tabular-nums')}>
            <TableHeader><TableRow>{['Algorithm / configuration', 'Capture rate', 'Escape time (ms)', 'Coordination score'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{configurations.map(config => {
              const rows = results.filter(r => r.solver_configuration_id === config.id), validEncounters = rows.filter(r => r.encounter_outcome !== null && r.encounter_outcome !== 'aborted');
              return <TableRow key={config.id}>
                <TableCell><div className="font-mono text-xs font-medium">{config.algorithm}</div><div className="text-xs text-muted-foreground">{config.code} · {familyLabels[config.family]}</div></TableCell>
                <TableCell>{percent(validEncounters.filter(r => r.encounter_outcome === 'player_captured').length, validEncounters.length)}</TableCell>
                <TableCell>{mean(rows.flatMap(r => r.encounter_outcome === 'player_escaped' && r.escape_time_ms !== null ? [r.escape_time_ms] : []), 0)}</TableCell>
                <TableCell>{mean(rows.flatMap(r => r.coordination_score !== null ? [r.coordination_score] : []), 2)}</TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        </Panel>
        <Panel title="Difficulty heat map" description={heatLayer + ' · pos_x / pos_y'} action={<ToggleGroup type="single" variant="outline" size="sm" spacing={0} value={heatLayer} onValueChange={value => { if (value) setHeatLayer(value as HeatLayer); }} aria-label="Heat map layer">
          {(Object.keys(heatLayers) as HeatLayer[]).map(layer => <ToggleGroupItem key={layer} value={layer} className="px-3">{heatLayers[layer]}</ToggleGroupItem>)}
        </ToggleGroup>}>
          {mapFilter === 'all' ? <Empty title="Select a map" description="Choose one map to view spatial events." /> : <div className="grid gap-3 px-6 pb-6"><div className="grid grid-cols-8 gap-1" role="img" aria-label={heatLayers[heatLayer] + ' heatmap'}>{Array.from({ length: 48 }, (_, i) => {
            const x = i % 8, y = Math.floor(i / 8), count = heatPoints.filter(d => Math.min(7, Math.floor((d.pos_x! - minX) / cellWidth)) === x && Math.min(5, Math.floor((d.pos_y! - minY) / cellHeight)) === y).length;
            // Sequential: one hue, opacity grows with the count; empty cells stay neutral.
            return <div key={i} className="relative grid aspect-[1.4] place-items-center overflow-hidden rounded-sm bg-muted text-[10px] text-foreground tabular-nums" title={`X ${(minX + x * cellWidth).toFixed(1)}–${(minX + (x + 1) * cellWidth).toFixed(1)}, Y ${(minY + y * cellHeight).toFixed(1)}–${(minY + (y + 1) * cellHeight).toFixed(1)}: ${count} ${heatLabel}`}>
              {count > 0 && <span aria-hidden="true" className="absolute inset-0 bg-chart-3" style={{ opacity: Math.min(.95, .25 + count * .18) }} />}<span className="relative">{count || '·'}</span></div>;
          })}</div><div className="flex items-center gap-3 text-xs text-muted-foreground">0 {heatLabel}<span className="h-2 w-32 rounded-sm bg-linear-to-r from-muted to-chart-3" />More {heatLabel}</div></div>}
        </Panel>
      </div>}
  </div>;
}
